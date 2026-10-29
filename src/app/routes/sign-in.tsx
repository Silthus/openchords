import { createFileRoute } from "@tanstack/react-router";
import { SignInScreen } from "../signIn";

type SignInSearch = { to?: string; returned?: true };

export const Route = createFileRoute("/sign-in")({
  validateSearch: (search: Record<string, unknown>): SignInSearch => ({
    ...(typeof search.to === "string" ? { to: search.to } : {}),
    ...(search.returned !== undefined ? { returned: true } : {}),
  }),
  component: function SignInRoute() {
    const { to, returned } = Route.useSearch();
    return <SignInScreen to={to} returned={returned === true} />;
  },
});
