import { fetchMutation, fetchQuery } from "convex/nextjs";
import { auth } from "@/app/(auth)/auth";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { resolveChatIdentifier } from "@/convex/chats";
import { ChatSDKError } from "@/lib/errors";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get("chatId");

  if (!chatId) {
    return new ChatSDKError(
      "bad_request:api",
      "Parameter chatId is required."
    ).toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:vote").toResponse();
  }

  let chat = await fetchQuery(api.chats.getChatByExternalId, {
    externalId: chatId,
  });
  if (!chat && !chatId.includes("-")) {
    try {
      chat = await fetchQuery(api.chats.getChatById, {
        id: chatId as Id<"chats">,
      });
    } catch (_) {
      // ignore internal id fetch
    }
  }

  if (!chat) {
    return new ChatSDKError("not_found:chat").toResponse();
  }

  if (chat.userId !== session.user.id) {
    return new ChatSDKError("forbidden:vote").toResponse();
  }

  const internalId = await resolveChatIdentifier(chatId);
  const votesRaw = internalId
    ? await fetchQuery(api.votes.getVotesByChatId, { chatId: internalId })
    : [];
  const votes = votesRaw.map((v) => ({ ...v, chatId, messageId: v.messageId }));

  return Response.json(votes, { status: 200 });
}

export async function PATCH(request: Request) {
  const {
    chatId,
    messageId,
    type,
  }: { chatId: string; messageId: string; type: "up" | "down" } =
    await request.json();

  if (!chatId || !messageId || !type) {
    return new ChatSDKError(
      "bad_request:api",
      "Parameters chatId, messageId, and type are required."
    ).toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:vote").toResponse();
  }

  let chat = await fetchQuery(api.chats.getChatByExternalId, {
    externalId: chatId,
  });
  if (!chat && !chatId.includes("-")) {
    try {
      chat = await fetchQuery(api.chats.getChatById, {
        id: chatId as Id<"chats">,
      });
    } catch (_) {
      // ignore internal id fetch
    }
  }

  if (!chat) {
    return new ChatSDKError("not_found:vote").toResponse();
  }

  if (chat.userId !== session.user.id) {
    return new ChatSDKError("forbidden:vote").toResponse();
  }

  const internalId = await resolveChatIdentifier(chatId);
  if (internalId) {
    await fetchMutation(api.votes.voteMessage, {
      chatId: internalId,
      messageId: messageId as Id<"messages">,
      isUpvoted: type === "up",
    });
  }

  return new Response("Message voted", { status: 200 });
}
