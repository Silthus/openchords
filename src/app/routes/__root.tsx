import { Outlet, createRootRoute } from "@tanstack/react-router";
import { useLookOnThePage } from "../deviceSettings";
import { NewVersionBanner } from "../NewVersionBanner";
import { useDropRemovedSongs } from "../offline";
import { PageNotFound } from "../PageNotFound";

export const Route = createRootRoute({
  component: function Root() {
    useLookOnThePage();
    useDropRemovedSongs();
    return (
      <div className="min-h-full bg-page text-ink">
        <Outlet />
        <NewVersionBanner />
      </div>
    );
  },
  notFoundComponent: PageNotFound,
});
