import { fetchQuery } from "convex/nextjs";
import { v } from "convex/values";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

// Chat entity operations
export const getChatsByUserId = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("chats")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

export const getChatByExternalId = query({
  args: { externalId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("chats")
      .withIndex("by_externalId", (q) => q.eq("externalId", args.externalId))
      .first();
  },
});

export const getChatById = query({
  args: { id: v.id("chats") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const saveChat = mutation({
  args: {
    externalId: v.string(),
    title: v.string(),
    userId: v.id("users"),
    visibility: v.optional(v.union(v.literal("public"), v.literal("private"))),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("chats")
      .withIndex("by_externalId", (q) => q.eq("externalId", args.externalId))
      .first();
    if (existing) {
      return existing._id;
    }
    return await ctx.db.insert("chats", {
      externalId: args.externalId,
      title: args.title,
      userId: args.userId,
      visibility: args.visibility ?? "private",
      createdAt: Date.now(),
    });
  },
});

export const deleteChatById = mutation({
  args: { id: v.id("chats") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_chat", (q) => q.eq("chatId", args.id))
      .collect();
    for (const m of messages) {
      await ctx.db.delete(m._id);
    }
    await ctx.db.delete(args.id);
  },
});

export const updateChatVisibility = mutation({
  args: {
    chatId: v.id("chats"),
    visibility: v.union(v.literal("public"), v.literal("private")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.chatId, { visibility: args.visibility });
  },
});

export const updateChatLastContext = mutation({
  args: { chatId: v.id("chats"), context: v.any() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.chatId, { lastContext: args.context });
  },
});

/** Resolve chat identifier (external UUID or internal Convex id). */
export async function resolveChatIdentifier(
  id: string
): Promise<Id<"chats"> | null> {
  // If the id looks like a UUID (contains hyphen), treat it purely as externalId.
  const isExternalUuid = id.includes("-");
  try {
    const byExternal = await fetchQuery(api.chats.getChatByExternalId, {
      externalId: id,
    });
    if (byExternal) {
      return byExternal._id as Id<"chats">;
    }
  } catch (_) {
    // ignore external lookup failure
  }
  if (!isExternalUuid) {
    try {
      const byInternal = await fetchQuery(api.chats.getChatById, {
        id: id as Id<"chats">,
      });
      if (byInternal) {
        return byInternal._id as Id<"chats">;
      }
    } catch (_) {
      // ignore internal lookup failure
    }
  }
  return null;
}
