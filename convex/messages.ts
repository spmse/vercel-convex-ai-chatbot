import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getMessagesByChatId = query({
  args: { chatId: v.id("chats") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
      .order("asc")
      .collect();
  },
});

export const getMessagesByExternalChatId = query({
  args: { externalId: v.string() },
  handler: async (ctx, args) => {
    const chat = await ctx.db
      .query("chats")
      .withIndex("by_externalId", (q) => q.eq("externalId", args.externalId))
      .first();
    if (!chat) {
      return [];
    }
    return await ctx.db
      .query("messages")
      .withIndex("by_chat", (q) => q.eq("chatId", chat._id))
      .order("asc")
      .collect();
  },
});

export const getMessageById = query({
  args: { id: v.id("messages") },
  handler: async (ctx, args) => ctx.db.get(args.id),
});

export const saveMessage = mutation({
  args: {
    chatId: v.id("chats"),
    role: v.string(),
    parts: v.any(),
    attachments: v.any(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("messages", {
      chatId: args.chatId,
      role: args.role,
      parts: args.parts,
      attachments: args.attachments,
      createdAt: Date.now(),
    });
  },
});

export const saveMessages = mutation({
  args: {
    messages: v.array(
      v.object({
        chatId: v.id("chats"),
        role: v.string(),
        parts: v.any(),
        attachments: v.any(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const ids: string[] = [];
    for (const m of args.messages) {
      const id = await ctx.db.insert("messages", {
        chatId: m.chatId,
        role: m.role,
        parts: m.parts,
        attachments: m.attachments,
        createdAt: Date.now(),
      });
      ids.push(id);
    }
    return ids;
  },
});

export const deleteMessagesByChatIdAfterTimestamp = mutation({
  args: { chatId: v.id("chats"), timestamp: v.number() },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
      .collect();
    for (const message of messages) {
      if (message.createdAt > args.timestamp) {
        await ctx.db.delete(message._id);
      }
    }
  },
});
