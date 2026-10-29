import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: StartScreen,
});

function StartScreen() {
  return (
    <main className="mx-auto max-w-xl px-5 pt-16">
      <h1 className="text-4xl font-bold tracking-tight">OpenChords</h1>
      <p className="mt-2 text-lg text-gray-600">Chords over the words, without the ads.</p>
    </main>
  );
}
