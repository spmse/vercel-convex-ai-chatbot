import { v } from "convex/values";
import { httpAction, mutation, query } from "./_generated/server";

/** Utility to generate random token */
function generateToken() {
  // Generates a 64-character hex string using Math.random
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, "0");
  }
  return token;
}

/** Central email sending placeholder. Replace with provider integration (Resend, Postmark, etc.) */
function sendEmail(to: string, subject: string, html: string) {
  if (!process.env.EMAIL_FROM || !process.env.PRODUCT_URL) {
    console.log("[DEV][email]", { to, subject, html });
    return;
  }
  // TODO: integrate provider, e.g. Resend
  console.log("[EMAIL] Would send via provider", { to, subject });
}

export const subscribe = mutation({
  args: { email: v.string() },
  handler: async (ctx, { email }: { email: string }) => {
    const normalized = email.trim().toLowerCase();
    const existing = await ctx.db
      .query("subscribers")
      .withIndex("by_email", (q) => q.eq("email", normalized))
      .unique();
    const token = generateToken();
    if (!existing) {
      await ctx.db.insert("subscribers", {
        email: normalized,
        createdAt: Date.now(),
        confirmed: false,
        unsubscribeToken: token,
      });
    } else if (existing.confirmed) {
      // Already subscribed
      return { status: "already_confirmed" };
    } else {
      // Update token for re-confirm attempt
      await ctx.db.patch(existing._id, { unsubscribeToken: token });
    }
    const productUrl = process.env.PRODUCT_URL || "http://localhost:3000";
    const confirmUrl = `${productUrl}/api/newsletter/confirm?token=${token}`;
    const unsubscribeUrl = `${productUrl}/api/newsletter/unsubscribe?token=${token}`;
    await sendEmail(
      normalized,
      "Confirm your subscription",
      `<p>Thanks for your interest! Please confirm your newsletter subscription:</p><p><a href="${confirmUrl}">Confirm Subscription</a></p><p>If you did not request this, ignore this email. You can unsubscribe any time: <a href="${unsubscribeUrl}">Unsubscribe</a></p>`
    );
    return { status: "pending_confirmation" };
  },
});

export const confirm = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }: { token: string }) => {
    const subscriber = await ctx.db
      .query("subscribers")
      .withIndex("by_token", (q) => q.eq("unsubscribeToken", token))
      .unique();
    if (!subscriber) {
      return { status: "invalid" };
    }
    if (subscriber.confirmed) {
      return { status: "already" };
    }
    await ctx.db.patch(subscriber._id, { confirmed: true });
    return { status: "confirmed" };
  },
});

export const unsubscribe = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }: { token: string }) => {
    const subscriber = await ctx.db
      .query("subscribers")
      .withIndex("by_token", (q) => q.eq("unsubscribeToken", token))
      .unique();
    if (!subscriber) {
      return { status: "invalid" };
    }
    await ctx.db.delete(subscriber._id);
    return { status: "unsubscribed" };
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("subscribers").collect();
  },
});

// HTTP endpoints for confirm/unsubscribe if needed outside of client SDK
export const http = httpAction(async (ctx, request) => {
  const { searchParams, pathname } = new URL(request.url);
  const token = searchParams.get("token") || "";
  if (!token) {
    return new Response("Missing token", { status: 400 });
  }
  if (pathname.endsWith("/confirm")) {
    // Using string reference to public mutation
    const res = await ctx.runMutation("newsletter:confirm" as any, { token });
    if (res.status === "confirmed" || res.status === "already") {
      return new Response("Subscription confirmed. You may close this window.");
    }
    return new Response("Invalid token", { status: 400 });
  }
  if (pathname.endsWith("/unsubscribe")) {
    const res = await ctx.runMutation("newsletter:unsubscribe" as any, {
      token,
    });
    if (res.status === "unsubscribed") {
      return new Response("You have been unsubscribed.");
    }
    return new Response("Invalid token", { status: 400 });
  }
  return new Response("Not Found", { status: 404 });
});
