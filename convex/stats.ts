import { v } from "convex/values";
import { query } from "./_generated/server";

export const getMessageCountByUserId = query({
  args: { userId: v.id("users"), hoursAgo: v.number() },
  handler: async (ctx, args) => {
    const cutoffTime = Date.now() - args.hoursAgo * 60 * 60 * 1000;
    const chats = await ctx.db
      .query("chats")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    let total = 0;
    for (const chat of chats) {
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_chat", (q) => q.eq("chatId", chat._id))
        .filter((q) =>
          q.and(
            q.gte(q.field("createdAt"), cutoffTime),
            q.eq(q.field("role"), "user")
          )
        )
        .collect();
      total += messages.length;
    }
    return total;
  },
});
