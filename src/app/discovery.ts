export type Discovery = "looking" | "moreComing" | "gaveUp" | "found" | "nothingFound";

type Answer = { complete: boolean; found?: number; retryAt?: number };

type DiscoveryPorts = {
  discover: () => Promise<Answer>;
  show: (discovery: Discovery) => void;
  later: (run: () => void, delayMs: number) => () => void;
};

const typingPauseMs = 400;

export function discoveryOf({ discover, show, later }: DiscoveryPorts) {
  let typedOver = false;
  const ask = async (isRepeat: boolean) => {
    const answer = await discover().catch(() => null);
    if (typedOver) return;
    if (answer?.complete) return show(answer.found ? "found" : "nothingFound");
    if (!answer || isRepeat || answer.retryAt === undefined) return show("gaveUp");
    show("moreComing");
    cancelNext = later(() => void ask(true), answer.retryAt - Date.now());
  };
  let cancelNext = later(() => void ask(false), typingPauseMs);
  return () => {
    typedOver = true;
    cancelNext();
  };
}
