import { afterEach, describe, expect, setSystemTime, test } from "bun:test";
import { discoveryOf, type Discovery } from "./discovery";

type Answer = { complete: boolean; retryAt?: number };

function aDiscovery(...answers: Array<Answer | Error>) {
  const shown: Discovery[] = [];
  const waiting: Array<() => void> = [];
  const delays: number[] = [];
  let asked = 0;
  const discover = async () => {
    const answer = answers[asked++]!;
    if (answer instanceof Error) throw answer;
    return answer;
  };
  const later = (run: () => void, delayMs: number) => {
    waiting.push(run);
    delays.push(delayMs);
    return () => waiting.splice(waiting.indexOf(run), 1);
  };
  const cancel = discoveryOf({ discover, show: (discovery) => shown.push(discovery), later });
  const runNext = () => waiting.shift()!();
  const wait = async () => {
    runNext();
    await Bun.sleep(0);
  };
  return { shown, delays, runNext, wait, cancel, asked: () => asked, pending: () => waiting.length };
}

afterEach(() => {
  setSystemTime();
});

describe("discovering more songs", () => {
  test("asks once she stops typing, and is done when the answer is complete", async () => {
    const discovery = aDiscovery({ complete: true });
    expect(discovery.asked()).toBe(0);
    expect(discovery.delays).toEqual([400]);
    await discovery.wait();
    expect(discovery.shown).toEqual(["done"]);
  });

  test("a busy answer brings more results at retryAt, once", async () => {
    setSystemTime(new Date("2026-10-30T08:00:00Z"));
    const discovery = aDiscovery({ complete: false, retryAt: Date.now() + 800 }, { complete: true });
    await discovery.wait();
    expect(discovery.shown).toEqual(["moreComing"]);
    expect(discovery.delays).toEqual([400, 800]);
    await discovery.wait();
    expect(discovery.shown).toEqual(["moreComing", "done"]);
    expect(discovery.asked()).toBe(2);
  });

  test("gives up when the one repeat is still busy, and asks no more", async () => {
    const discovery = aDiscovery({ complete: false, retryAt: Date.now() + 800 }, { complete: false, retryAt: Date.now() + 1800 });
    await discovery.wait();
    await discovery.wait();
    expect(discovery.shown).toEqual(["moreComing", "gaveUp"]);
    expect(discovery.pending()).toBe(0);
    expect(discovery.asked()).toBe(2);
  });

  test("gives up when the search fails", async () => {
    const discovery = aDiscovery(new Error("MusicBrainz answered 400"));
    await discovery.wait();
    expect(discovery.shown).toEqual(["gaveUp"]);
    expect(discovery.pending()).toBe(0);
  });

  test("a search she typed over before it asked asks nothing", () => {
    const discovery = aDiscovery({ complete: true });
    discovery.cancel();
    expect(discovery.pending()).toBe(0);
    expect(discovery.asked()).toBe(0);
  });

  test("a search she typed over while it asked shows nothing and repeats nothing", async () => {
    const discovery = aDiscovery({ complete: false, retryAt: Date.now() + 800 });
    discovery.runNext();
    discovery.cancel();
    await Bun.sleep(0);
    expect(discovery.shown).toEqual([]);
    expect(discovery.pending()).toBe(0);
  });
});
