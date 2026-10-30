import type { SheetMeta } from "../../sheet";

const originNames = { builtIn: "Built in", ai: "AI draft · unverified", person: "Fixed by hand" };

export type Origin = keyof typeof originNames;

export function describeChordSheet(origin: Origin, { key, capo }: Pick<SheetMeta, "key" | "capo">) {
  const capoPart = capo === 0 ? [] : [`capo ${capo}`];
  return [originNames[origin], ...(key === undefined ? [] : [key]), ...capoPart].join(" · ");
}

export function describeCapo(capo: number) {
  return capo === 0 ? "No capo" : `Capo on fret ${capo}`;
}
