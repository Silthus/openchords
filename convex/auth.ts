import { convexAuth } from "@convex-dev/auth/server";
import { google, refuseUninvited } from "./access";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [google],
  callbacks: {
    afterUserCreatedOrUpdated: (ctx, { profile }) => refuseUninvited(ctx.db, profile),
  },
});
