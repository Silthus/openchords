import { useConvexAuth } from "convex/react";

export function SaveToggle({ saved, onToggle }: { saved: boolean; onToggle: () => void }) {
  const { isAuthenticated } = useConvexAuth();
  if (!isAuthenticated) return null;
  return (
    <button
      type="button"
      aria-pressed={saved}
      onClick={onToggle}
      className={`shrink-0 rounded-full px-4 py-1.5 font-semibold ${saved ? "bg-orange-500 text-white" : "bg-panel"}`}
    >
      {saved ? "★ Saved" : "☆ Save"}
    </button>
  );
}
