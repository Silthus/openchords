import { useAuthActions } from "@convex-dev/auth/react";
import { useCallback } from "react";
import { forgetEverySongWhile } from "../offline";

export function useSignOut() {
  const { signOut } = useAuthActions();
  return useCallback(() => forgetEverySongWhile(signOut), [signOut]);
}
