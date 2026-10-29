import { Link } from "@tanstack/react-router";
import { useConvex } from "convex/react";
import type { ReactNode } from "react";
import { api } from "../../../convex/_generated/api";

type SongLinkProps = {
  songId: string;
  chordSheetId?: string;
  replace?: boolean;
  current?: boolean;
  className?: string;
  children: ReactNode;
};

export function SongLink({ songId, chordSheetId, replace, current, className, children }: SongLinkProps) {
  const convex = useConvex();
  const prewarm = () => convex.prewarmQuery({ query: api.catalog.index.song, args: { songId } });
  return (
    <Link
      to={chordSheetId === undefined ? "/songs/$songId" : "/songs/$songId/sheets/$chordSheetId"}
      params={{ songId, chordSheetId }}
      replace={replace}
      preload="intent"
      onTouchStart={prewarm}
      onMouseEnter={prewarm}
      onFocus={prewarm}
      aria-current={current ? "page" : undefined}
      className={className}
    >
      {children}
    </Link>
  );
}
