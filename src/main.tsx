import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { SongScreenPrototype } from "./prototype/song-screen/SongScreenPrototype";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SongScreenPrototype />
  </StrictMode>,
);
