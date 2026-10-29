import { convexAuth } from "@convex-dev/auth/server";
import { google, refuseUninvited, testUserProviders } from "./access";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [google, ...testUserProviders()],
  callbacks: {
    afterUserCreatedOrUpdated: (ctx, { profile }) => refuseUninvited(ctx.db, profile),
  },
});
