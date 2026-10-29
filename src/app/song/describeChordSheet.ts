import type { SheetMeta } from "../../sheet";

const originNames = { builtIn: "Built in" };

export function describeChordSheet(origin: keyof typeof originNames, { key, capo }: Pick<SheetMeta, "key" | "capo">) {
  const capoPart = capo === 0 ? [] : [`capo ${capo}`];
  return [originNames[origin], ...(key === undefined ? [] : [key]), ...capoPart].join(" · ");
}
