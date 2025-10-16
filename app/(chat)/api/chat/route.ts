import { geolocation } from "@vercel/functions";
import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  smoothStream,
  stepCountIs,
  streamText,
} from "ai";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { unstable_cache as cache } from "next/cache";
import { after } from "next/server";
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from "resumable-stream";
import type { ModelCatalog } from "tokenlens/core";
import { fetchModels } from "tokenlens/fetch";
import { getUsage } from "tokenlens/helpers";
import { auth, type UserType } from "@/app/(auth)/auth";
import type { VisibilityType } from "@/components/visibility-selector";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { resolveChatIdentifier } from "@/convex/chats";
import { entitlementsByUserType } from "@/lib/ai/entitlements";
import type { ChatModel } from "@/lib/ai/models";
import { type RequestHints, systemPrompt } from "@/lib/ai/prompts";
import { myProvider } from "@/lib/ai/providers";
import { createDocument } from "@/lib/ai/tools/create-document";
import { getWeather } from "@/lib/ai/tools/get-weather";
import { requestSuggestions } from "@/lib/ai/tools/request-suggestions";
import { updateDocument } from "@/lib/ai/tools/update-document";
import { isProductionEnvironment } from "@/lib/constants";
import { ChatSDKError } from "@/lib/errors";
import { FEATURE_WEATHER_TOOL } from "@/lib/feature-flags";
import type { ChatMessage } from "@/lib/types";
import type { AppUsage } from "@/lib/usage";
import { convertToUIMessages, generateUUID } from "@/lib/utils";
import { generateTitleFromUserMessage } from "../../actions";
import { type PostRequestBody, postRequestBodySchema } from "./schema";

export const maxDuration = 60;

let globalStreamContext: ResumableStreamContext | null = null;

const getTokenlensCatalog = cache(
  async (): Promise<ModelCatalog | undefined> => {
    try {
      return await fetchModels();
    } catch (err) {
      console.warn(
        "TokenLens: catalog fetch failed, using default catalog",
        err
      );
      return; // tokenlens helpers will fall back to defaultCatalog
    }
  },
  ["tokenlens-catalog"],
  { revalidate: 24 * 60 * 60 } // 24 hours
);

export function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
      });
    } catch (error: any) {
      if (error.message.includes("REDIS_URL")) {
        console.log(
          " > Resumable streams are disabled due to missing REDIS_URL"
        );
      } else {
        console.error(error);
      }
    }
  }

  return globalStreamContext;
}

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (_) {
    return new ChatSDKError("bad_request:api").toResponse();
  }

  try {
    const {
      id,
      message,
      selectedChatModel,
      selectedVisibilityType,
    }: {
      id: string;
      message: ChatMessage;
      selectedChatModel: ChatModel["id"];
      selectedVisibilityType: VisibilityType;
    } = requestBody;

    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError("unauthorized:chat").toResponse();
    }

    const userType: UserType = session.user.type;

    const messageCount = await fetchQuery(api.stats.getMessageCountByUserId, {
      userId: session.user.id as any,
      hoursAgo: 24,
    });

    if (messageCount > entitlementsByUserType[userType].maxMessagesPerDay) {
      return new ChatSDKError("rate_limit:chat").toResponse();
    }

    // Attempt external lookup first (UUIDs contain hyphens and cannot be Convex ids)
    let chatRecord = await fetchQuery(api.chats.getChatByExternalId, {
      externalId: id,
    });
    if (!chatRecord && !id.includes("-")) {
      // Only attempt internal id if it doesn't look like an external UUID
      try {
        chatRecord = await fetchQuery(api.chats.getChatById, {
          id: id as Id<"chats">,
        });
      } catch (_) {
        // ignore invalid internal id attempts
      }
    }
    if (chatRecord) {
      if (chatRecord.userId !== (session.user.id as any)) {
        return new ChatSDKError("forbidden:chat").toResponse();
      }
    } else {
      const title = await generateTitleFromUserMessage({
        message,
      });
      await fetchMutation(api.chats.saveChat, {
        externalId: id,
        userId: session.user.id as any,
        title,
        visibility: selectedVisibilityType,
      });
    }
    // Load messages (prefer external id path first)
    // Prefer external messages; fallback to internal only if resolver succeeds
    let messagesFromDb = await fetchQuery(
      api.messages.getMessagesByExternalChatId,
      { externalId: id }
    );
    if (messagesFromDb.length === 0) {
      const internalChatId = await resolveChatIdentifier(id);
      if (internalChatId) {
        messagesFromDb = await fetchQuery(api.messages.getMessagesByChatId, {
          chatId: internalChatId,
        });
      }
    }
    const normalizedMessages = messagesFromDb.map((m) => ({
      ...m,
      id: (m as any)._id,
      chatId: id,
      role: m.role as any,
      content: m.parts || [],
      parts: m.parts,
      experimental_attachments: m.attachments,
      createdAt: new Date(m.createdAt),
    }));
    const uiMessages = [...convertToUIMessages(normalizedMessages), message];

    const { longitude, latitude, city, country } = geolocation(request);

    const requestHints: RequestHints = {
      longitude,
      latitude,
      city,
      country,
    };

    const internalChatIdResolved = await resolveChatIdentifier(id);
    const ensuredInternalChatId = internalChatIdResolved
      ? internalChatIdResolved
      : await fetchMutation(api.chats.saveChat, {
          externalId: id,
          title: "",
          userId: session.user.id as any,
          visibility: selectedVisibilityType,
        });
    await fetchMutation(api.messages.saveMessage, {
      chatId: ensuredInternalChatId as any,
      role: "user",
      parts: message.parts,
      attachments: [],
    });

    const internalChatId = await resolveChatIdentifier(id); // used for optional resumable context
    if (internalChatId) {
      await fetchMutation(api.streams.createStream, { chatId: internalChatId });
    }

    let finalMergedUsage: AppUsage | undefined;

    const stream = createUIMessageStream({
      execute: ({ writer: dataStream }) => {
        const result = streamText({
          model: myProvider.languageModel(selectedChatModel),
          system: systemPrompt({ selectedChatModel, requestHints }),
          messages: convertToModelMessages(uiMessages),
          stopWhen: stepCountIs(5),
          experimental_activeTools:
            selectedChatModel === "chat-model-reasoning"
              ? []
              : ([
                  ...(FEATURE_WEATHER_TOOL ? ["getWeather"] : []),
                  "createDocument",
                  "updateDocument",
                  "requestSuggestions",
                ] as (
                  | "getWeather"
                  | "createDocument"
                  | "updateDocument"
                  | "requestSuggestions"
                )[]),
          experimental_transform: smoothStream({ chunking: "word" }),
          tools: {
            ...(FEATURE_WEATHER_TOOL ? { getWeather } : {}),
            createDocument: createDocument({ session, dataStream }),
            updateDocument: updateDocument({ session, dataStream }),
            requestSuggestions: requestSuggestions({
              session,
              dataStream,
            }),
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: "stream-text",
          },
          onFinish: async ({ usage }) => {
            try {
              const providers = await getTokenlensCatalog();
              const modelId =
                myProvider.languageModel(selectedChatModel).modelId;
              if (!modelId) {
                finalMergedUsage = usage;
                dataStream.write({
                  type: "data-usage",
                  data: finalMergedUsage,
                });
                return;
              }

              if (!providers) {
                finalMergedUsage = usage;
                dataStream.write({
                  type: "data-usage",
                  data: finalMergedUsage,
                });
                return;
              }

              const summary = getUsage({ modelId, usage, providers });
              finalMergedUsage = { ...usage, ...summary, modelId } as AppUsage;
              dataStream.write({ type: "data-usage", data: finalMergedUsage });
            } catch (err) {
              console.warn("TokenLens enrichment failed", err);
              finalMergedUsage = usage;
              dataStream.write({ type: "data-usage", data: finalMergedUsage });
            }
          },
        });

        result.consumeStream();

        dataStream.merge(
          result.toUIMessageStream({
            sendReasoning: true,
          })
        );
      },
      generateId: generateUUID,
      onFinish: async ({ messages }) => {
        const internalChatIdFinal = await resolveChatIdentifier(id);
        if (internalChatIdFinal) {
          for (const currentMessage of messages) {
            await fetchMutation(api.messages.saveMessage, {
              chatId: internalChatIdFinal,
              role: currentMessage.role,
              parts: currentMessage.parts,
              attachments: [],
            });
          }
        }

        if (finalMergedUsage) {
          try {
            const internalId = await resolveChatIdentifier(id);
            if (internalId) {
              await fetchMutation(api.chats.updateChatLastContext, {
                chatId: internalId,
                context: finalMergedUsage,
              });
            }
          } catch (err) {
            console.warn("Unable to persist last usage for chat", id, err);
          }
        }
      },
      onError: () => {
        return "Oops, an error occurred!";
      },
    });

    // const streamContext = getStreamContext();

    // if (streamContext) {
    //   return new Response(
    //     await streamContext.resumableStream(streamId, () =>
    //       stream.pipeThrough(new JsonToSseTransformStream())
    //     )
    //   );
    // }

    return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
  } catch (error) {
    const vercelId = request.headers.get("x-vercel-id");

    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    // Check for Vercel AI Gateway credit card error
    if (
      error instanceof Error &&
      error.message?.includes(
        "AI Gateway requires a valid credit card on file to service requests"
      )
    ) {
      return new ChatSDKError("bad_request:activate_gateway").toResponse();
    }

    console.error("Unhandled error in chat API:", error, { vercelId });
    return new ChatSDKError("offline:chat").toResponse();
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new ChatSDKError("bad_request:api").toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  let chatRecord = await fetchQuery(api.chats.getChatByExternalId, {
    externalId: id,
  });
  if (!chatRecord) {
    try {
      chatRecord = await fetchQuery(api.chats.getChatById, {
        id: id as Id<"chats">,
      });
    } catch (_) {
      // ignore internal chat id fetch failure
    }
  }

  if (chatRecord?.userId !== (session.user.id as any)) {
    return new ChatSDKError("forbidden:chat").toResponse();
  }

  const internalId = await resolveChatIdentifier(id);
  if (!internalId) {
    return new ChatSDKError("not_found:chat").toResponse();
  }
  await fetchMutation(api.chats.deleteChatById, { id: internalId });
  return Response.json({ id }, { status: 200 });
}
