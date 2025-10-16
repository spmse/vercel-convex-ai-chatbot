import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

// Restored Convex auth config (used only for Convex-side helpers; primary user auth is via NextAuth)
export const { auth, signIn, signOut, store } = convexAuth({
  providers: [Password({ id: "password" }), Password({ id: "guest" })],
});
