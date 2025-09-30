import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createUser = mutation({
  args: {
    email: v.string(),
    password: v.optional(v.string()),
    type: v.union(v.literal("guest"), v.literal("regular")),
  },
  handler: async (ctx, args) => {
    const userId = await ctx.db.insert("users", {
      email: args.email,
      password: args.password,
      type: args.type,
      createdAt: Date.now(),
    });
    return userId;
  },
});

export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

export const getUserById = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const createGuestUser = mutation({
  handler: async (ctx) => {
    const guestEmail = `guest-${Math.random().toString(36).substring(2)}@guest.local`;
    const userId = await ctx.db.insert("users", {
      email: guestEmail,
      type: "guest",
      createdAt: Date.now(),
    });
    const user = await ctx.db.get(userId);
    return user;
  },
});
