"use client";

import Link from "next/link";
import { useFeatureFlags } from "@/hooks/use-feature-flags";

function ProceedAsGuestButton() {
  const { guestAccounts } = useFeatureFlags();
  return (
    <button
      className="rounded-md border px-4 py-2 font-medium text-sm transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
      disabled={!guestAccounts}
      onClick={() => {
        if (!guestAccounts) {
          return;
        }
        window.location.href = "/api/auth/guest?redirectUrl=/";
      }}
      type="button"
    >
      Proceed as Guest
    </button>
  );
}

export default function LoginLandingPage() {
  return (
    <div className="flex h-dvh w-screen items-center justify-center bg-background p-6">
      <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-2xl border bg-card p-8 text-center shadow-sm">
        <h1 className="font-semibold text-xl">Welcome</h1>
        <p className="text-muted-foreground text-sm">
          Choose how you would like to continue.
        </p>
        <div className="flex w-full flex-col gap-3">
          <Link
            className="rounded-md border px-4 py-2 font-medium text-sm transition-colors hover:bg-accent"
            href="/login/form"
          >
            Email / Password Login
          </Link>
          <Link
            className="rounded-md border px-4 py-2 font-medium text-sm transition-colors hover:bg-accent"
            href="/register"
          >
            Create Account
          </Link>
          <ProceedAsGuestButton />
        </div>
        <div className="mt-4 text-muted-foreground text-xs">
          Guest accounts are temporary. Create an account to retain history.
        </div>
      </div>
    </div>
  );
}
