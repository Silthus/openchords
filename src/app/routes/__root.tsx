import { Link, Outlet, createRootRoute } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: () => (
    <div className="min-h-full bg-white text-gray-900">
      <Outlet />
    </div>
  ),
  notFoundComponent: PageNotFound,
});

function PageNotFound() {
  return (
    <main className="mx-auto max-w-xl px-5 pt-16">
      <h1 className="text-4xl font-bold tracking-tight">OpenChords</h1>
      <p className="mt-2 text-lg text-gray-600">There is nothing at this link.</p>
      <Link to="/" className="mt-6 inline-block text-lg font-semibold underline">
        Back to the start
      </Link>
    </main>
  );
}
