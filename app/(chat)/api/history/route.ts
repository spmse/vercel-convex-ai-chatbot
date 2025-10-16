import { fetchQuery } from "convex/nextjs";
import type { NextRequest } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ChatSDKError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const limit = Number.parseInt(searchParams.get("limit") || "10", 10);
  const startingAfter = searchParams.get("starting_after");
  const endingBefore = searchParams.get("ending_before");

  if (startingAfter && endingBefore) {
    return new ChatSDKError(
      "bad_request:api",
      "Only one of starting_after or ending_before can be provided."
    ).toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  const chatsRaw = await fetchQuery(api.chats.getChatsByUserId, {
    userId: session.user.id as Id<"users">,
  });
  const sorted = chatsRaw.sort((a, b) => b.createdAt - a.createdAt);
  let filtered = sorted;
  let startIndex = 0;
  if (startingAfter) {
    const afterIndex = filtered.findIndex(
      (c) => (c.externalId || c._id) === startingAfter
    );
    if (afterIndex !== -1) {
      startIndex = afterIndex + 1;
    }
  } else if (endingBefore) {
    const beforeIndex = filtered.findIndex(
      (c) => (c.externalId || c._id) === endingBefore
    );
    if (beforeIndex !== -1) {
      filtered = filtered.slice(0, beforeIndex);
    }
  }
  const paginated = filtered.slice(startIndex, startIndex + limit);
  const hasMore = startIndex + limit < filtered.length;
  return Response.json({
    chats: paginated.map((c) => ({
      ...c,
      id: c.externalId || c._id,
      userId: c.userId,
      createdAt: new Date(c.createdAt),
    })),
    hasMore,
  });
}
