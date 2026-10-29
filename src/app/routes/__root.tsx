import { Outlet, createRootRoute } from "@tanstack/react-router";
import { PageNotFound } from "../PageNotFound";

export const Route = createRootRoute({
  component: () => (
    <div className="min-h-full bg-white text-stone-900">
      <Outlet />
    </div>
  ),
  notFoundComponent: PageNotFound,
});
