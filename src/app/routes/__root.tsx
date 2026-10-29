import { Outlet, createRootRoute } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: () => (
    <div className="min-h-full bg-white text-gray-900">
      <Outlet />
    </div>
  ),
});
