import { createUIMessageStream, JsonToSseTransformStream } from "ai";
import { fetchQuery } from "convex/nextjs";
import { differenceInSeconds } from "date-fns";
import { auth } from "@/app/(auth)/auth";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { resolveChatIdentifier } from "@/convex/chats";
import type { Chat } from "@/lib/db/schema";
import { ChatSDKError } from "@/lib/errors";
import type { ChatMessage } from "@/lib/types";
import { getStreamContext } from "../../route";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: chatId } = await params;
  const streamContext = getStreamContext();
  const resumeRequestedAt = new Date();
  if (!streamContext) {
    return new Response(null, { status: 204 });
  }
  if (!chatId) {
    return new ChatSDKError("bad_request:api").toResponse();
  }
  const session = await auth();
  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }
  let chat: Chat | null;
  try {
    const external = await fetchQuery(api.chats.getChatByExternalId, {
      externalId: chatId,
    });
    const withId = (c: any) =>
      c
        ? { ...c, id: c.externalId || c._id, createdAt: new Date(c.createdAt) }
        : null;
    let candidate = withId(external);
    if (!candidate && !chatId.includes("-")) {
      try {
        const internal = await fetchQuery(api.chats.getChatById, {
          id: chatId as Id<"chats">,
        });
        candidate = withId(internal);
      } catch (_internalErr) {
        // ignore
      }
    }
    chat = candidate as any;
  } catch {
    return new ChatSDKError("not_found:chat").toResponse();
  }
  if (!chat) {
    return new ChatSDKError("not_found:chat").toResponse();
  }
  if (chat.visibility === "private" && chat.userId !== session.user.id) {
    return new ChatSDKError("forbidden:chat").toResponse();
  }
  const internalChatId = await resolveChatIdentifier(chatId);
  const streamRecords = internalChatId
    ? await fetchQuery(api.streams.getStreamsByChatId, {
        chatId: internalChatId,
      })
    : [];
  const streamIds = streamRecords.map((s) => s._id);
  if (!streamIds.length) {
    return new ChatSDKError("not_found:stream").toResponse();
  }
  const recentStreamId = streamIds.at(-1);
  if (!recentStreamId) {
    return new ChatSDKError("not_found:stream").toResponse();
  }
  const emptyDataStream = createUIMessageStream<ChatMessage>({
    // biome-ignore lint/suspicious/noEmptyBlockStatements: <explanation>
    execute: () => {},
  });
  const stream = await streamContext.resumableStream(recentStreamId, () =>
    emptyDataStream.pipeThrough(new JsonToSseTransformStream())
  );
  if (!stream) {
    let messages = internalChatId
      ? await fetchQuery(api.messages.getMessagesByChatId, {
          chatId: internalChatId,
        })
      : [];
    if (!messages.length) {
      messages = await fetchQuery(api.messages.getMessagesByExternalChatId, {
        externalId: chatId,
      });
    }
    const normalized = messages.map((m) => ({
      ...m,
      id: m._id,
      chatId,
      role: m.role,
      parts: m.parts,
      createdAt: new Date(m.createdAt),
    }));
    const mostRecentMessage = normalized.at(-1);
    if (!mostRecentMessage) {
      return new Response(emptyDataStream, { status: 200 });
    }
    if (mostRecentMessage.role !== "assistant") {
      return new Response(emptyDataStream, { status: 200 });
    }
    const messageCreatedAt = new Date(mostRecentMessage.createdAt);
    if (differenceInSeconds(resumeRequestedAt, messageCreatedAt) > 15) {
      return new Response(emptyDataStream, { status: 200 });
    }
    const restoredStream = createUIMessageStream<ChatMessage>({
      execute: ({ writer }) => {
        writer.write({
          type: "data-appendMessage",
          data: JSON.stringify(mostRecentMessage),
          transient: true,
        });
      },
    });
    return new Response(
      restoredStream.pipeThrough(new JsonToSseTransformStream()),
      { status: 200 }
    );
  }
  return new Response(stream, { status: 200 });
}
