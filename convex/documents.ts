import { fetchQuery } from "convex/nextjs";
import { v } from "convex/values";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

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
  handler: async (ctx, args) => ctx.db.get(args.id),
});

export const saveDocument = mutation({
  args: {
    externalId: v.optional(v.string()),
    title: v.string(),
    content: v.optional(v.string()),
    kind: v.union(
      v.literal("text"),
      v.literal("code"),
      v.literal("image"),
      v.literal("sheet")
    ),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    if (args.externalId) {
      const existing = await ctx.db
        .query("documents")
        .withIndex("by_externalId", (q) =>
          q.eq("externalId", args.externalId as string)
        )
        .first();
      if (existing) {
        return existing._id;
      }
    }
    return await ctx.db.insert("documents", {
      externalId: args.externalId || crypto.randomUUID(),
      title: args.title,
      content: args.content,
      kind: args.kind,
      userId: args.userId,
      createdAt: Date.now(),
    });
  },
});

export const getDocumentByExternalId = query({
  args: { externalId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("documents")
      .withIndex("by_externalId", (q) => q.eq("externalId", args.externalId))
      .first();
  },
});

export const updateDocument = mutation({
  args: {
    id: v.id("documents"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = {};
    if (args.title !== undefined) {
      updates.title = args.title;
    }
    if (args.content !== undefined) {
      updates.content = args.content;
    }
    await ctx.db.patch(args.id, updates);
  },
});

export const deleteDocumentById = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const suggestions = await ctx.db
      .query("suggestions")
      .withIndex("by_document", (q) => q.eq("documentId", args.id))
      .collect();
    for (const s of suggestions) {
      await ctx.db.delete(s._id);
    }
    await ctx.db.delete(args.id);
  },
});

export const deleteDocumentsByIdAfterTimestamp = mutation({
  args: { documentId: v.string(), timestamp: v.number() },
  handler: async (ctx, args) => {
    const docs = await ctx.db
      .query("documents")
      .filter((q) =>
        q.and(
          q.eq(q.field("title"), args.documentId),
          q.gt(q.field("createdAt"), args.timestamp)
        )
      )
      .collect();
    for (const doc of docs) {
      const suggestions = await ctx.db
        .query("suggestions")
        .withIndex("by_document", (q) => q.eq("documentId", doc._id))
        .collect();
      for (const suggestion of suggestions) {
        await ctx.db.delete(suggestion._id);
      }
      await ctx.db.delete(doc._id);
    }
    return docs;
  },
});

/** Resolve document identifier (external UUID or internal Convex id). */
export async function resolveDocumentIdentifier(
  id: string
): Promise<Id<"documents"> | null> {
  try {
    const byExternal = await fetchQuery(api.documents.getDocumentByExternalId, {
      externalId: id,
    });
    if (byExternal) {
      return byExternal._id as Id<"documents">;
    }
  } catch (_) {
    // ignore external lookup failure
  }
  try {
    const byInternal = await fetchQuery(api.documents.getDocumentById, {
      id: id as Id<"documents">,
    });
    if (byInternal) {
      return byInternal._id as Id<"documents">;
    }
  } catch (_) {
    // ignore internal lookup failure
  }
  return null;
}
