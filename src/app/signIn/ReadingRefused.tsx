import { ErrorComponent, useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { ConvexError } from "convex/values";
import { useEffect, useRef } from "react";
import { useSignOut } from "./useSignOut";

type Refusal = "SIGN_IN_REQUIRED" | "NOT_INVITED";

export function ReadingRefused({ error }: ErrorComponentProps) {
  const refusal = refusalOf(error);
  if (refusal === undefined) return <ErrorComponent error={error} />;
  return <SendToSignIn refusal={refusal} />;
}

function refusalOf(error: unknown): Refusal | undefined {
  if (!(error instanceof ConvexError)) return undefined;
  const code: unknown = error.data?.code;
  return code === "SIGN_IN_REQUIRED" || code === "NOT_INVITED" ? code : undefined;
}

function SendToSignIn({ refusal }: { refusal: Refusal }) {
  const router = useRouter();
  const signOut = useSignOut();
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    const refusedHere = router.state.location.href;
    const notInvited = refusal === "NOT_INVITED";
    void (async () => {
      if (notInvited) await signOut();
      await router.navigate({ to: "/sign-in", search: notInvited ? { to: refusedHere, returned: true } : { to: refusedHere }, replace: true });
    })();
  }, [refusal, router, signOut]);
  return null;
}
