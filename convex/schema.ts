import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Removed Convex auth tables; NextAuth manages auth.
  users: defineTable({
    email: v.string(),
    password: v.optional(v.string()),
    createdAt: v.number(),
    type: v.union(v.literal("guest"), v.literal("regular")),
  }).index("by_email", ["email"]),

  chats: defineTable({
    externalId: v.string(), // client-generated UUID
    title: v.string(),
    userId: v.id("users"),
    visibility: v.union(v.literal("public"), v.literal("private")),
    createdAt: v.number(),
    lastContext: v.optional(v.any()), // For AppUsage type
  })
    .index("by_user", ["userId"])
    .index("by_externalId", ["externalId"]),

  messages: defineTable({
    chatId: v.id("chats"),
    role: v.string(),
    parts: v.any(), // JSON array
    attachments: v.any(), // JSON array
    createdAt: v.number(),
  }).index("by_chat", ["chatId"]),

  votes: defineTable({
    chatId: v.id("chats"),
    messageId: v.id("messages"),
    isUpvoted: v.boolean(),
  }).index("by_chat_and_message", ["chatId", "messageId"]),

  documents: defineTable({
    title: v.string(),
    content: v.optional(v.string()),
    kind: v.union(
      v.literal("text"),
      v.literal("code"),
      v.literal("image"),
      v.literal("sheet")
    ),
    userId: v.id("users"),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  suggestions: defineTable({
    documentId: v.id("documents"),
    originalText: v.string(),
    suggestedText: v.string(),
    description: v.optional(v.string()),
    isResolved: v.boolean(),
    userId: v.id("users"),
    createdAt: v.number(),
  }).index("by_document", ["documentId"]),

  streams: defineTable({
    chatId: v.id("chats"),
    createdAt: v.number(),
  }).index("by_chat", ["chatId"]),

  // For file storage
  files: defineTable({
    name: v.string(),
    type: v.string(),
    size: v.number(),
    storageId: v.id("_storage"),
    userId: v.id("users"),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),
});
