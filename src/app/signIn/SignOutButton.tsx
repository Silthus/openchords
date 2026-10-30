import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { forgetEverySong } from "../offline";

export function SignOutButton() {
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  if (!isAuthenticated) return null;
  const signOutAndForget = () => void forgetEverySong().then(signOut);
  return (
    <button type="button" onClick={signOutAndForget} className="mt-2 w-full py-3 font-semibold text-muted">
      Sign out
    </button>
  );
}
