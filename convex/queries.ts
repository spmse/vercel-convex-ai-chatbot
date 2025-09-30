import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Chat queries
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

export const getChatById = query({
  args: { id: v.id("chats") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const saveChat = mutation({
  args: {
    title: v.string(),
    userId: v.id("users"),
    visibility: v.optional(v.union(v.literal("public"), v.literal("private"))),
  },
  handler: async (ctx, args) => {
    const chatId = await ctx.db.insert("chats", {
      title: args.title,
      userId: args.userId,
      visibility: args.visibility ?? "private",
      createdAt: Date.now(),
    });
    return chatId;
  },
});

export const deleteChatById = mutation({
  args: { id: v.id("chats") },
  handler: async (ctx, args) => {
    // Delete related messages first
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_chat", (q) => q.eq("chatId", args.id))
      .collect();
    
    for (const message of messages) {
      await ctx.db.delete(message._id);
    }
    
    // Delete the chat
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

// Message queries
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

export const getMessageById = query({
  args: { id: v.id("messages") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const saveMessage = mutation({
  args: {
    chatId: v.id("chats"),
    role: v.string(),
    parts: v.any(),
    attachments: v.any(),
  },
  handler: async (ctx, args) => {
    const messageId = await ctx.db.insert("messages", {
      chatId: args.chatId,
      role: args.role,
      parts: args.parts,
      attachments: args.attachments,
      createdAt: Date.now(),
    });
    return messageId;
  },
});

export const deleteMessagesByChatIdAfterTimestamp = mutation({
  args: {
    chatId: v.id("chats"),
    timestamp: v.number(),
  },
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

// Vote queries
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
    // Check if vote already exists
    const existingVote = await ctx.db
      .query("votes")
      .withIndex("by_chat_and_message", (q) => 
        q.eq("chatId", args.chatId).eq("messageId", args.messageId)
      )
      .first();
    
    if (existingVote) {
      await ctx.db.patch(existingVote._id, { isUpvoted: args.isUpvoted });
      return existingVote._id;
    } else {
      return await ctx.db.insert("votes", args);
    }
  },
});

// Document queries
export const getDocumentsByUserId = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

export const getDocumentById = query({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const saveDocument = mutation({
  args: {
    title: v.string(),
    content: v.optional(v.string()),
    kind: v.union(v.literal("text"), v.literal("code"), v.literal("image"), v.literal("sheet")),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const documentId = await ctx.db.insert("documents", {
      title: args.title,
      content: args.content,
      kind: args.kind,
      userId: args.userId,
      createdAt: Date.now(),
    });
    return documentId;
  },
});

export const updateDocument = mutation({
  args: {
    id: v.id("documents"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updates: any = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.content !== undefined) updates.content = args.content;
    
    await ctx.db.patch(args.id, updates);
  },
});

export const deleteDocumentById = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    // Delete related suggestions first
    const suggestions = await ctx.db
      .query("suggestions")
      .withIndex("by_document", (q) => q.eq("documentId", args.id))
      .collect();
    
    for (const suggestion of suggestions) {
      await ctx.db.delete(suggestion._id);
    }
    
    // Delete the document
    await ctx.db.delete(args.id);
  },
});

// Suggestion queries
export const getSuggestionsByDocumentId = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("suggestions")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .collect();
  },
});

export const saveSuggestion = mutation({
  args: {
    documentId: v.id("documents"),
    originalText: v.string(),
    suggestedText: v.string(),
    description: v.optional(v.string()),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const suggestionId = await ctx.db.insert("suggestions", {
      documentId: args.documentId,
      originalText: args.originalText,
      suggestedText: args.suggestedText,
      description: args.description,
      isResolved: false,
      userId: args.userId,
      createdAt: Date.now(),
    });
    return suggestionId;
  },
});

export const updateSuggestion = mutation({
  args: {
    id: v.id("suggestions"),
    isResolved: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { isResolved: args.isResolved });
  },
});

// Stream queries
export const saveStream = mutation({
  args: {
    chatId: v.id("chats"),
  },
  handler: async (ctx, args) => {
    const streamId = await ctx.db.insert("streams", {
      chatId: args.chatId,
      createdAt: Date.now(),
    });
    return streamId;
  },
});

export const getStreamById = query({
  args: { id: v.id("streams") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const deleteStreamById = mutation({
  args: { id: v.id("streams") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Additional functions for backward compatibility
export const getStreamsByChatId = query({
  args: { chatId: v.id("chats") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("streams")
      .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
      .collect();
  },
});

export const createStream = mutation({
  args: { chatId: v.id("chats") },
  handler: async (ctx, args) => {
    return await ctx.db.insert("streams", {
      chatId: args.chatId,
      createdAt: Date.now(),
    });
  },
});

export const getMessageCountByUserId = query({
  args: { 
    userId: v.id("users"), 
    hoursAgo: v.number() 
  },
  handler: async (ctx, args) => {
    const cutoffTime = Date.now() - (args.hoursAgo * 60 * 60 * 1000);
    
    // Get all chats for the user
    const userChats = await ctx.db
      .query("chats")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    
    let totalCount = 0;
    
    for (const chat of userChats) {
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
      
      totalCount += messages.length;
    }
    
    return totalCount;
  },
});

export const updateChatLastContext = mutation({
  args: {
    chatId: v.id("chats"),
    context: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.chatId, {
      lastContext: args.context,
    });
  },
});

export const deleteDocumentsByIdAfterTimestamp = mutation({
  args: {
    documentId: v.string(),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    // Get documents to delete by querying with string id
    const docs = await ctx.db
      .query("documents")
      .filter((q) => 
        q.and(
          q.eq(q.field("title"), args.documentId), // Using title as a workaround for string id matching
          q.gt(q.field("createdAt"), args.timestamp)
        )
      )
      .collect();
    
    // Delete related suggestions first
    for (const doc of docs) {
      const suggestions = await ctx.db
        .query("suggestions")
        .withIndex("by_document", (q) => q.eq("documentId", doc._id))
        .collect();
      
      for (const suggestion of suggestions) {
        await ctx.db.delete(suggestion._id);
      }
      
      // Delete the document
      await ctx.db.delete(doc._id);
    }
    
    return docs;
  },
});

export const voteMessage = mutation({
  args: {
    chatId: v.id("chats"),
    messageId: v.id("messages"),
    isUpvoted: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Check if vote already exists using the correct index
    const existingVote = await ctx.db
      .query("votes")
      .withIndex("by_chat_and_message", (q) => 
        q.eq("chatId", args.chatId).eq("messageId", args.messageId)
      )
      .first();
    
    if (existingVote) {
      // Update existing vote
      await ctx.db.patch(existingVote._id, {
        isUpvoted: args.isUpvoted,
      });
      return existingVote._id;
    } else {
      // Create new vote
      return await ctx.db.insert("votes", {
        chatId: args.chatId,
        messageId: args.messageId,
        isUpvoted: args.isUpvoted,
      });
    }
  },
});
