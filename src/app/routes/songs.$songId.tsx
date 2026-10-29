import { createFileRoute, useParams } from "@tanstack/react-router";
import { SongScreen } from "../song/SongScreen";

export const Route = createFileRoute("/songs/$songId")({
  component: function SongRoute() {
    const { songId } = Route.useParams();
    const { chordSheetId } = useParams({ strict: false });
    return <SongScreen songId={songId} chordSheetId={chordSheetId} />;
  },
});
