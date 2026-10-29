import { Link } from "@tanstack/react-router";

export function PageNotFound() {
  return (
    <main className="mx-auto max-w-xl px-5 pt-16">
      <h1 className="text-4xl font-bold tracking-tight">OpenChords</h1>
      <p className="mt-2 text-lg text-muted">There is nothing at this link.</p>
      <Link to="/" className="mt-6 inline-block text-lg font-semibold underline">
        Back to the start
      </Link>
    </main>
  );
}
