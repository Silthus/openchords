import { useAuthActions } from "@convex-dev/auth/react";
import { useNavigate } from "@tanstack/react-router";
import { useConvexAuth } from "convex/react";
import { useEffect } from "react";
import { Logo } from "../Logo";
import { returnPath } from "./returnPath";

export function SignInScreen({ to, returned }: { to?: string; returned: boolean }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const destination = returnPath(to);
  if (isLoading) return null;
  if (isAuthenticated) return <GoTo path={destination} />;
  return (
    <main className="mx-auto max-w-xl px-5 pt-16">
      <Logo />
      {returned ? (
        <p role="alert" className="mt-4 text-lg">
          OpenChords is invite-only. Ask the person who shared this link.
        </p>
      ) : (
        <p className="mt-4 text-lg text-muted">Sign in to play along.</p>
      )}
      <SignInWithGoogle destination={destination} />
    </main>
  );
}

function SignInWithGoogle({ destination }: { destination: string }) {
  const { signIn } = useAuthActions();
  const comeBackHere = `/sign-in?${new URLSearchParams({ to: destination, returned: "1" })}`;
  return (
    <button
      type="button"
      onClick={() => void signIn("google", { redirectTo: comeBackHere })}
      className="mt-8 w-full rounded-xl bg-orange-500 py-3 text-lg font-semibold text-white"
    >
      Sign in with Google
    </button>
  );
}

function GoTo({ path }: { path: string }) {
  const navigate = useNavigate();
  useEffect(() => {
    void navigate({ href: path, replace: true });
  }, [navigate, path]);
  return null;
}
