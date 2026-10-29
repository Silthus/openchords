import { Link } from "@tanstack/react-router";
import { useConvex } from "convex/react";
import type { ReactNode } from "react";
import { api } from "../../../convex/_generated/api";

export function SongLink({ songId, className, children }: { songId: string; className?: string; children: ReactNode }) {
  const convex = useConvex();
  const prewarm = () => convex.prewarmQuery({ query: api.catalog.index.song, args: { songId } });
  return (
    <Link
      to="/songs/$songId"
      params={{ songId }}
      preload="intent"
      onTouchStart={prewarm}
      onMouseEnter={prewarm}
      onFocus={prewarm}
      className={className}
    >
      {children}
    </Link>
  );
}
