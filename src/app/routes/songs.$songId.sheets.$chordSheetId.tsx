import { createFileRoute } from "@tanstack/react-router";
import { SongScreen } from "../song/SongScreen";

export const Route = createFileRoute("/songs/$songId/sheets/$chordSheetId")({
  component: function ChordSheetRoute() {
    const { songId, chordSheetId } = Route.useParams();
    return <SongScreen songId={songId} chordSheetId={chordSheetId} />;
  },
});
