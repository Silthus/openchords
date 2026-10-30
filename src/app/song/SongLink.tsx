import { Link } from "@tanstack/react-router";
import { useConvex } from "convex/react";
import type { ReactNode } from "react";
import { api } from "../../../convex/_generated/api";

type SongLinkProps = {
  songId: string;
  chordSheetId?: string;
  inPlace?: boolean;
  current?: boolean;
  onClick?: () => void;
  className?: string;
  children: ReactNode;
};

export function SongLink({ songId, chordSheetId, inPlace, current, onClick, className, children }: SongLinkProps) {
  const convex = useConvex();
  const prewarm = () => convex.prewarmQuery({ query: api.catalog.index.song, args: { songId } });
  return (
    <Link
      to={chordSheetId === undefined ? "/songs/$songId" : "/songs/$songId/sheets/$chordSheetId"}
      params={{ songId, chordSheetId }}
      replace={inPlace}
      resetScroll={!inPlace}
      preload="intent"
      onTouchStart={prewarm}
      onMouseEnter={prewarm}
      onFocus={prewarm}
      onClick={onClick}
      aria-current={current ? "page" : undefined}
      className={className}
    >
      {children}
    </Link>
  );
}
