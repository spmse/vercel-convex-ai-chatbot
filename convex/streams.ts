import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createStream = mutation({
  args: { chatId: v.id("chats") },
  handler: async (ctx, args) => {
    return await ctx.db.insert("streams", {
      chatId: args.chatId,
      createdAt: Date.now(),
    });
  },
});

export const saveStream = mutation({
  args: { chatId: v.id("chats") },
  handler: async (ctx, args) => {
    return await ctx.db.insert("streams", {
      chatId: args.chatId,
      createdAt: Date.now(),
    });
  },
});

export const getStreamsByChatId = query({
  args: { chatId: v.id("chats") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("streams")
      .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
      .collect();
  },
});

export const getStreamById = query({
  args: { id: v.id("streams") },
  handler: async (ctx, args) => ctx.db.get(args.id),
});

export const deleteStreamById = mutation({
  args: { id: v.id("streams") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
