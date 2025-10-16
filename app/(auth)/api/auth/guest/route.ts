import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { signIn } from "@/app/(auth)/auth";
import { isDevelopmentEnvironment } from "@/lib/constants";
import { ChatSDKError } from "@/lib/errors";
import { FEATURE_GUEST_ACCOUNTS } from "@/lib/feature-flags";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const redirectUrl = searchParams.get("redirectUrl") || "/";

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: !isDevelopmentEnvironment,
  });

  if (token) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  if (!FEATURE_GUEST_ACCOUNTS) {
    return new ChatSDKError(
      "forbidden:auth",
      "Guest accounts are disabled."
    ).toResponse();
  }
  return signIn("guest", { redirect: true, redirectTo: redirectUrl });
}
