import { isChord, type ChordLayer } from "../../../src/sheet";
import { SourceUnavailable, type ChordDraft, type Lyrics, type SongHit } from "..";
import { promptTemplate } from "./prompt";

const completionsUrl = "https://ai-gateway.convex.dev/v1/chat/completions";
const model = "openai/gpt-6.1-terra";
const attempts = 2;

type Fetch = (url: string, init: RequestInit) => Promise<Response>;
type Placement = { line: number; word: number; chord: string };
type Chart = { abstain: boolean; key: string; capo: number; sections: Array<{ name: string; line: number }>; placements: Placement[] };

export function ai({ fetch, token }: { fetch: Fetch; token: () => Promise<string> }) {
  async function ask(prompt: string): Promise<string> {
    const response = await fetch(completionsUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${await token()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], reasoning_effort: "medium" }),
    });
    if (response.status === 429 || response.status >= 500) throw new SourceUnavailable("ai", 60_000);
    if (!response.ok) throw new Error(`The AI gateway answered ${response.status}`);
    const completion = (await response.json()) as { choices: Array<{ message: { content: string } }> };
    return completion.choices[0]?.message.content ?? "";
  }

  return {
    async chordsFor(song: SongHit, lyrics: Lyrics): Promise<ChordDraft[]> {
      const prompt = promptFor(song, lyrics.lines);
      for (let attempt = 0; attempt < attempts; attempt++) {
        const layer = layerFrom(await ask(prompt), lyrics.lines);
        if (layer) return [{ name: "AI draft", layer, origin: "ai", provenance: await provenance() }];
      }
      return [];
    },
  };
}

function promptFor(song: SongHit, lines: string[]) {
  return promptTemplate
    .replace("{title}", song.title)
    .replace("{artist}", song.artist)
    .replace("{lyrics}", lines.map((line, index) => `${index}: ${line}`).join("\n"));
}

async function provenance() {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(promptTemplate));
  const promptHash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return { source: "ai" as const, recordId: `${model}#${promptHash.slice(0, 12)}`, licence: "ai-generated", fetchedAt: Date.now() };
}

function layerFrom(answer: string, lines: string[]): ChordLayer | null {
  const chart = chartIn(answer);
  if (!chart || chart.abstain || typeof chart.key !== "string" || !isChord(chart.key) || !isCapo(chart.capo)) return null;
  if (chart.placements.length === 0 || !chart.placements.every((placement) => isPlacedOn(placement, lines))) return null;
  if (!inReadingOrder(chart.placements) || !inReadingOrder(chart.sections.map(({ line }) => ({ line, word: 0 })))) return null;
  if (!chart.sections.every(({ line }) => line >= 0 && line < lines.length)) return null;
  return {
    key: chart.key,
    capo: chart.capo,
    sections: chart.sections.map(({ name, line }) => ({ label: labelOf(name), fromLine: line })),
    lines: lines.map((_, lyricLine) => ({
      lyricLine,
      chords: chart.placements.filter(({ line }) => line === lyricLine).map(({ word, chord }) => ({ word, chord })),
    })),
  };
}

function chartIn(answer: string): Chart | null {
  try {
    const chart = JSON.parse(answer) as Chart;
    return Array.isArray(chart?.placements) && Array.isArray(chart.sections) ? chart : null;
  } catch {
    return null;
  }
}

function isCapo(capo: unknown) {
  return Number.isInteger(capo) && (capo as number) >= 0 && (capo as number) < 12;
}

function isPlacedOn({ line, word, chord }: Placement, lines: string[]) {
  const words = lines[line]?.split(/\s+/).filter((text) => text !== "") ?? [];
  return Number.isInteger(word) && word >= 0 && word < words.length && typeof chord === "string" && isChord(chord);
}

function inReadingOrder(anchors: Array<{ line: number; word: number }>) {
  return anchors.every((anchor, index) => {
    const before = anchors[index - 1];
    return !before || anchor.line > before.line || (anchor.line === before.line && anchor.word >= before.word);
  });
}

function labelOf(name: string) {
  return name.charAt(0).toUpperCase() + name.slice(1);
}
