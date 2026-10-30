import { SongLink } from "./song/SongLink";

type SongRowProps = { song: { songId: string; title: string; artist: string; hasSheets?: boolean } };

export function SongRow({ song }: SongRowProps) {
  return (
    <li>
      <SongLink songId={song.songId} className="block py-3">
        <span className="block text-lg font-semibold">{song.title}</span>
        <span className="block text-muted">
          {song.artist}
          {song.hasSheets === false && " · Words only"}
        </span>
      </SongLink>
    </li>
  );
}
