import { createFileRoute } from "@tanstack/react-router";
import { SignInScreen } from "../signIn";

type SignInSearch = { to?: string; returned?: true; testUser?: string };

export const Route = createFileRoute("/sign-in")({
  validateSearch: (search: Record<string, unknown>): SignInSearch => ({
    ...(typeof search.to === "string" ? { to: search.to } : {}),
    ...(search.returned !== undefined ? { returned: true } : {}),
    ...(typeof search.testUser === "string" ? { testUser: search.testUser } : {}),
  }),
  component: function SignInRoute() {
    const { to, returned, testUser } = Route.useSearch();
    return <SignInScreen to={to} returned={returned === true} testUser={testUser} />;
  },
});
