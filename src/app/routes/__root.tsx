import { Outlet, createRootRoute } from "@tanstack/react-router";
import { useLookOnThePage } from "../deviceSettings";
import { PageNotFound } from "../PageNotFound";

export const Route = createRootRoute({
  component: function Root() {
    useLookOnThePage();
    return (
      <div className="min-h-full bg-page text-ink">
        <Outlet />
      </div>
    );
  },
  notFoundComponent: PageNotFound,
});
