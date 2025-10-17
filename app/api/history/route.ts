import { fetchQuery } from "convex/nextjs";
import { auth } from "@/app/(auth)/auth";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ChatSDKError } from "@/lib/errors";

// Response shape expected by SidebarHistory: { chats: Chat[]; hasMore: boolean }
// We derive chats from Convex chat records and normalize fields.

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit");
  const endingBefore = url.searchParams.get("ending_before");

  const limit = Math.min(Math.max(Number(limitParam) || 20, 1), 100);

  try {
    // Fetch all chats for user (Convex doesn't yet provide cursor pagination here; we'll slice manually).
    const chats = await fetchQuery(api.chats.getChatsByUserId, {
      userId: session.user.id as unknown as Id<"users">,
    });

    // chats are returned newest first per schema ordering; find index if ending_before provided
    let startIndex = 0;
    if (endingBefore) {
      const idx = chats.findIndex(
        (c) =>
          c._id === endingBefore ||
          c.externalId === endingBefore ||
          c._id === endingBefore
      );
      if (idx !== -1) {
        startIndex = idx + 1; // start after the referenced chat
      }
    }

    const pageSlice = chats.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < chats.length;

    const normalized = pageSlice.map((c) => ({
      _id: c._id,
      _creationTime: c._creationTime,
      id: c.externalId ?? c._id,
      userId: c.userId,
      title: c.title || "Untitled Chat",
      visibility: c.visibility ?? "private",
      lastContext: c.lastContext,
      createdAt: new Date(c.createdAt ?? c._creationTime),
    }));

    return Response.json({ chats: normalized, hasMore }, { status: 200 });
  } catch (err) {
    console.error("history route error", err);
    return new ChatSDKError("offline:chat").toResponse();
  }
}
