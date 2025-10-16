import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getVotesByChatId = query({
  args: { chatId: v.id("chats") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("votes")
      .withIndex("by_chat_and_message", (q) => q.eq("chatId", args.chatId))
      .collect();
  },
});

export const saveVote = mutation({
  args: {
    chatId: v.id("chats"),
    messageId: v.id("messages"),
    isUpvoted: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existingVote = await ctx.db
      .query("votes")
      .withIndex("by_chat_and_message", (q) =>
        q.eq("chatId", args.chatId).eq("messageId", args.messageId)
      )
      .first();
    if (existingVote) {
      await ctx.db.patch(existingVote._id, { isUpvoted: args.isUpvoted });
      return existingVote._id;
    }
    return await ctx.db.insert("votes", args);
  },
});

export const voteMessage = mutation({
  args: {
    chatId: v.id("chats"),
    messageId: v.id("messages"),
    isUpvoted: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("votes")
      .withIndex("by_chat_and_message", (q) =>
        q.eq("chatId", args.chatId).eq("messageId", args.messageId)
      )
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { isUpvoted: args.isUpvoted });
      return existing._id;
    }
    return await ctx.db.insert("votes", args);
  },
});
