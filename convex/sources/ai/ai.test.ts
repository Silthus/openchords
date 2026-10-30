import { describe, expect, test } from "bun:test";
import { compose } from "../../../src/sheet";
import recorded from "../../fixtures/aiAmazingGrace.json";
import amazingGrace from "../../fixtures/lrclibAmazingGrace.json";
import { SourceUnavailable, type Lyrics } from "..";
import { ai } from ".";

const judyCollins = { title: "Amazing Grace", artist: "Judy Collins", durationSec: 234 };
const lyrics: Lyrics = {
  lines: amazingGrace.plainLyrics.split("\n").filter((line) => line.trim() !== ""),
  provenance: { source: "lrclib", recordId: "19200992", licence: "lrclib-api", fetchedAt: 0 },
};

type Draft = { abstain: boolean; key: string; capo: number; sections: unknown[]; placements: Array<{ line: number; word: number; chord: string }> };
const recordedDraft = JSON.parse(recorded.choices[0]!.message.content) as Draft;

function answer(draft: Draft) {
  return Response.json({ ...recorded, choices: [{ ...recorded.choices[0], message: { role: "assistant", content: JSON.stringify(draft) } }] });
}

function withPlacements(change: (placements: Draft["placements"]) => Draft["placements"]) {
  return answer({ ...recordedDraft, placements: change(recordedDraft.placements) });
}

function answering(...responses: Response[]) {
  const requests: Request[] = [];
  const fetch = async (url: string, init: RequestInit) => {
    requests.push(new Request(url, init));
    return responses[Math.min(requests.length, responses.length) - 1]!.clone();
  };
  return { source: ai({ fetch, token: async () => "deployment-token" }), requests };
}

const aMadeUpChord = withPlacements((placements) => placements.map((placement, index) => (index === 3 ? { ...placement, chord: "Fsus9x" } : placement)));
const aWordPastTheLine = withPlacements((placements) => [...placements, { line: 23, word: 6, chord: "F" }]);
const aLinePastTheWords = withPlacements((placements) => [...placements, { line: 24, word: 0, chord: "F" }]);
const outOfOrder = withPlacements(([first, second, ...rest]) => [second!, first!, ...rest]);

describe("the AI source", () => {
  test("drafts chords over her words, as an AI draft with the model and prompt it came from", async () => {
    const { source } = answering(Response.json(recorded));
    const [draft, ...more] = await source.chordsFor(judyCollins, lyrics);
    expect(more).toHaveLength(0);
    expect(draft).toMatchObject({ name: "AI draft", origin: "ai", provenance: { source: "ai", licence: "ai-generated" } });
    expect(draft!.provenance.recordId).toMatch(/^openai\/gpt-6\.1-terra#[0-9a-f]{12}$/);
    expect(draft!.layer).toMatchObject({ key: "F", capo: 0 });
    expect(draft!.layer.sections.slice(0, 2)).toEqual([
      { label: "Verse", fromLine: 0 },
      { label: "Verse", fromLine: 4 },
    ]);
    const firstLines = compose(lyrics.lines, draft!.layer, judyCollins).split("\n").slice(6, 8);
    expect(firstLines).toEqual(["[F]Amazing [Bb]grace, [F]how sweet the sound", "[F]That saved a wretch like [C7]me"]);
  });

  test("asks Terra at medium effort with only the title, the artist and her numbered words", async () => {
    const { source, requests } = answering(Response.json(recorded));
    await source.chordsFor(judyCollins, lyrics);
    const [request] = requests;
    expect(request!.headers.get("Authorization")).toBe("Bearer deployment-token");
    const body = await request!.json();
    expect(body).toMatchObject({ model: "openai/gpt-6.1-terra", reasoning_effort: "medium" });
    expect(body.messages[0].content).toContain("TITLE: Amazing Grace\nARTIST: Judy Collins\n");
    expect(body.messages[0].content).toContain("\n0: Amazing grace, how sweet the sound\n1: That saved a wretch like me\n");
  });

  test.each([
    ["a made-up chord", aMadeUpChord],
    ["a chord past the last word of its line", aWordPastTheLine],
    ["a chord on a line that does not exist", aLinePastTheWords],
    ["chords out of reading order", outOfOrder],
    ["no chords at all", withPlacements(() => [])],
    ["an abstention", answer({ ...recordedDraft, abstain: true })],
    ["an answer that is not a chart", answer("I cannot help with that" as unknown as Draft)],
    ["a placement that is not an anchor", withPlacements((placements) => [...placements, null as unknown as Draft["placements"][number]])],
    ["a line number written as text", withPlacements((placements) => placements.map((placement) => ({ ...placement, line: String(placement.line) as unknown as number })))],
    ["a section without a name", answer({ ...recordedDraft, sections: [{ line: 0 }] })],
  ])("a draft with %s is asked for again once", async (_, wrong) => {
    const { source, requests } = answering(wrong, Response.json(recorded));
    const [draft, ...more] = await source.chordsFor(judyCollins, lyrics);
    expect(more).toHaveLength(0);
    expect(draft!.layer.lines[0]!.chords).toEqual([
      { word: 0, chord: "F" },
      { word: 1, chord: "Bb" },
      { word: 2, chord: "F" },
    ]);
    expect(requests).toHaveLength(2);
  });

  test("two wrong drafts leave the song without chords and ask no more", async () => {
    const { source, requests } = answering(aMadeUpChord, aWordPastTheLine, Response.json(recorded));
    expect(await source.chordsFor(judyCollins, lyrics)).toEqual([]);
    expect(requests).toHaveLength(2);
  });

  test.each([429, 503])("a busy gateway (%i) says to try again later", async (status) => {
    const { source } = answering(new Response("busy", { status }));
    await expect(source.chordsFor(judyCollins, lyrics)).rejects.toBeInstanceOf(SourceUnavailable);
  });
});
