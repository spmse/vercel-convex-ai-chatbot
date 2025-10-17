import { fetchMutation, fetchQuery } from "convex/nextjs";
import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { api } from "@/convex/_generated/api";
import { ChatSDKError } from "@/lib/errors";

// Legacy POST body (unused now by UI but keep temporarily)
const legacyVoteBodySchema = z.object({
  chatId: z.string(),
  messageId: z.string(),
  isUpvoted: z.boolean(),
});

// PATCH body used by UI (type: up | down)
const patchVoteBodySchema = z.object({
  chatId: z.string(),
  messageId: z.string(),
  type: z.enum(["up", "down"]),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }
  const url = new URL(request.url);
  const chatId = url.searchParams.get("chatId");
  if (!chatId) {
    return new ChatSDKError("bad_request:api").toResponse();
  }
  try {
    // Resolve internal chat id
    const chatRecord = await fetchQuery(api.chats.getChatByExternalId, {
      externalId: chatId,
    });
    if (!chatRecord) {
      return new ChatSDKError("not_found:chat").toResponse();
    }
    if (chatRecord.userId !== (session.user.id as any)) {
      return new ChatSDKError("forbidden:chat").toResponse();
    }

    // Fetch persisted votes
    const votes = await fetchQuery(api.votes.getVotesByChatId, {
      chatId: chatRecord._id as any,
    });
    const normalized = votes.map((v) => ({
      _id: v._id,
      _creationTime: v._creationTime,
      chatId,
      messageId: v.messageId,
      isUpvoted: v.isUpvoted,
    }));
    return Response.json(normalized, { status: 200 });
  } catch (err) {
    console.error("vote GET error", err);
    return new ChatSDKError("offline:chat").toResponse();
  }
}

// Keep for backward compatibility if anything sends POST with explicit isUpvoted boolean.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }
  let body: z.infer<typeof legacyVoteBodySchema>;
  try {
    body = legacyVoteBodySchema.parse(await request.json());
  } catch (_) {
    return new ChatSDKError("bad_request:api").toResponse();
  }
  try {
    const { chatId, messageId, isUpvoted } = body;
    const chatRecord = await fetchQuery(api.chats.getChatByExternalId, {
      externalId: chatId,
    });
    if (!chatRecord) {
      return new ChatSDKError("not_found:chat").toResponse();
    }
    if (chatRecord.userId !== (session.user.id as any)) {
      return new ChatSDKError("forbidden:chat").toResponse();
    }
    // Persist legacy style
    await fetchMutation(api.votes.upsertVote, {
      chatId: chatRecord._id as any,
      messageId: messageId as any,
      isUpvoted,
    });
    return Response.json({ chatId, messageId, isUpvoted }, { status: 200 });
  } catch (err) {
    console.error("vote POST error", err);
    return new ChatSDKError("offline:chat").toResponse();
  }
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }
  let body: z.infer<typeof patchVoteBodySchema>;
  try {
    body = patchVoteBodySchema.parse(await request.json());
  } catch (_) {
    return new ChatSDKError("bad_request:api").toResponse();
  }
  try {
    const { chatId, messageId, type } = body;
    const chatRecord = await fetchQuery(api.chats.getChatByExternalId, {
      externalId: chatId,
    });
    if (!chatRecord) {
      return new ChatSDKError("not_found:chat").toResponse();
    }
    if (chatRecord.userId !== (session.user.id as any)) {
      return new ChatSDKError("forbidden:chat").toResponse();
    }
    const isUpvoted = type === "up";
    await fetchMutation(api.votes.upsertVote, {
      chatId: chatRecord._id as any,
      messageId: messageId as any,
      isUpvoted,
    });
    return Response.json({ chatId, messageId, isUpvoted }, { status: 200 });
  } catch (err) {
    console.error("vote PATCH error", err);
    return new ChatSDKError("offline:chat").toResponse();
  }
}
