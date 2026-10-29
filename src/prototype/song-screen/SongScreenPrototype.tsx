// PROTOTYPE (throwaway). Round 1: three variants of the song screen, switchable via ?variant=A|B|C.
import { useState } from "react";
import { PrototypeSwitcher } from "./PrototypeSwitcher";
import { useSongScreenState } from "./shared";
import { VariantA } from "./VariantA";
import { VariantB } from "./VariantB";
import { VariantC } from "./VariantC";

const VARIANTS = [
  { key: "A", name: "Classic sheet", Component: VariantA },
  { key: "B", name: "Stage", Component: VariantB },
  { key: "C", name: "Follow along", Component: VariantC },
];

const SHOW_SWITCHER = import.meta.env.VITE_PROTOTYPE === "1";

function readVariant() {
  return new URLSearchParams(location.search).get("variant") ?? "A";
}

export function SongScreenPrototype() {
  const [variant, setVariant] = useState(readVariant);
  const state = useSongScreenState();
  const { Component } = VARIANTS.find((v) => v.key === variant) ?? VARIANTS[0];

  const changeVariant = (key: string) => {
    const url = new URL(location.href);
    url.searchParams.set("variant", key);
    history.replaceState(null, "", url);
    setVariant(key);
  };

  const summary = `sheet=${state.sheet.id} key=${state.key} transpose=${state.transpose} capo=${state.capo} speed=${state.speed} ${state.playing ? "playing" : "paused"} text=${state.textSize}x`;

  return (
    <div style={{ ["--proto-bar" as string]: SHOW_SWITCHER ? "56px" : "0px" }} className="h-full">
      <Component key={variant} state={state} />
      {SHOW_SWITCHER && <PrototypeSwitcher variants={VARIANTS} current={variant} onChange={changeVariant} state={summary} />}
    </div>
  );
}
