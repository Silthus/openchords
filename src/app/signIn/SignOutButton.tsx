import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";

export function SignOutButton() {
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  if (!isAuthenticated) return null;
  return (
    <button type="button" onClick={() => void signOut()} className="mt-2 w-full py-3 font-semibold text-muted">
      Sign out
    </button>
  );
}
