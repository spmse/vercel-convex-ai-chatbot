import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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
    return await ctx.db.insert("suggestions", {
      documentId: args.documentId,
      originalText: args.originalText,
      suggestedText: args.suggestedText,
      description: args.description,
      isResolved: false,
      userId: args.userId,
      createdAt: Date.now(),
    });
  },
});

export const updateSuggestion = mutation({
  args: { id: v.id("suggestions"), isResolved: v.boolean() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { isResolved: args.isResolved });
  },
});
