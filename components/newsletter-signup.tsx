"use client";
import { useMutation } from "convex/react";
import React from "react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";

export function NewsletterSignup() {
  const subscribe = useMutation(api.newsletter.subscribe);
  const [email, setEmail] = React.useState("");
  const [status, setStatus] = React.useState<null | string>(null);
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await subscribe({ email });
      if (res.status === "pending_confirmation") {
        toast.success("Check your inbox to confirm");
        setStatus("pending");
      } else if (res.status === "already_confirmed") {
        toast.info("Already subscribed");
        setStatus("already");
      }
    } catch (err: any) {
      toast.error("Failed to subscribe");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-24" id="newsletter">
      <div className="rounded-2xl border bg-card/60 p-8 backdrop-blur">
        <h2 className="font-semibold text-2xl">Stay in the loop</h2>
        <p className="mt-2 text-muted-foreground text-sm">
          Product changelogs, roadmap updates & early feature access. No spam.
        </p>
        <form
          className="mt-6 flex flex-col gap-4 sm:flex-row"
          onSubmit={onSubmit}
        >
          <input
            className="w-full flex-1 rounded-md border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            type="email"
            value={email}
          />
          <button
            className="rounded-md bg-foreground px-6 py-3 font-medium text-background shadow disabled:opacity-60"
            disabled={loading}
            type="submit"
          >
            {loading
              ? "Sending..."
              : status === "pending"
                ? "Sent"
                : "Subscribe"}
          </button>
        </form>
        {status === "pending" && (
          <p className="mt-3 text-muted-foreground text-xs">
            Check your email to confirm the subscription.
          </p>
        )}
      </div>
    </section>
  );
}
