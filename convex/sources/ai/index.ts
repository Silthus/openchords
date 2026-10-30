import { isChord, type ChordLayer } from "../../../src/sheet";
import { SourceUnavailable, type ChordDraft, type DraftRequest, type Lyrics, type SongHit } from "..";
import { promptTemplate } from "./prompt";

const completionsUrl = "https://ai-gateway.convex.dev/v1/chat/completions";
const model = "openai/gpt-6.1-terra";
const attempts = 2;
const sectionNames = ["intro", "verse", "pre-chorus", "chorus", "bridge", "solo", "interlude", "outro", "other"];

type Fetch = (url: string, init: RequestInit) => Promise<Response>;
type Placement = { line: number; word: number; chord: string };
type Section = { name: string; line: number };

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
    async chordsFor(song: SongHit, lyrics: Lyrics, { retrying = false }: DraftRequest = {}): Promise<ChordDraft[]> {
      const prompt = promptFor(song, lyrics.lines);
      for (let attempt = 0; attempt < (retrying ? 1 : attempts); attempt++) {
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
  const chart = jsonIn(answer);
  if (!isRecord(chart) || chart.abstain !== false || !isChordName(chart.key) || !isCapo(chart.capo)) return null;
  const sections = everyOrNothing(chart.sections, (section) => sectionOn(section, lines));
  const placements = everyOrNothing(chart.placements, (placement) => placementOn(placement, lines));
  if (!sections || !placements || placements.length === 0) return null;
  if (!inReadingOrder(placements) || !inReadingOrder(sections.map(({ line }) => ({ line, word: 0 })))) return null;
  return {
    key: chart.key,
    capo: chart.capo,
    sections: sections.map(({ name, line }) => ({ label: labelOf(name), fromLine: line })),
    lines: lines.map((_, lyricLine) => ({
      lyricLine,
      chords: placements.filter(({ line }) => line === lyricLine).map(({ word, chord }) => ({ word, chord })),
    })),
  };
}

function jsonIn(answer: string): unknown {
  try {
    return JSON.parse(answer);
  } catch {
    return null;
  }
}

function everyOrNothing<T>(items: unknown, decode: (item: unknown) => T | null): T[] | null {
  if (!Array.isArray(items)) return null;
  const decoded = items.map(decode);
  return decoded.every((item) => item !== null) ? (decoded as T[]) : null;
}

function sectionOn(section: unknown, lines: string[]): Section | null {
  if (!isRecord(section) || !isSectionName(section.name) || !isIndexBelow(section.line, lines.length)) return null;
  return { name: section.name, line: section.line };
}

function placementOn(placement: unknown, lines: string[]): Placement | null {
  if (!isRecord(placement) || !isChordName(placement.chord) || !isIndexBelow(placement.line, lines.length)) return null;
  const afterTheLastWord = lines[placement.line]!.split(/\s+/).filter((text) => text !== "").length;
  return isIndexBelow(placement.word, afterTheLastWord + 1) ? { line: placement.line, word: placement.word, chord: placement.chord } : null;
}

function isSectionName(value: unknown): value is string {
  return typeof value === "string" && sectionNames.includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isChordName(value: unknown): value is string {
  return typeof value === "string" && isChord(value);
}

function isCapo(value: unknown): value is number {
  return isIndexBelow(value, 12);
}

function isIndexBelow(value: unknown, length: number): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) < length;
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
