import { createFileRoute } from "@tanstack/react-router";
import { SongScreen } from "../song/SongScreen";

export const Route = createFileRoute("/songs/$songId/")({
  component: function SongRoute() {
    const { songId } = Route.useParams();
    return <SongScreen songId={songId} />;
  },
});
