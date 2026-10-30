import { describe, expect, test } from "bun:test";
import amazingGrace from "../../fixtures/lrclibAmazingGrace.json";
import { SourceUnavailable } from "..";
import { lrclib } from ".";

const judyCollins = { title: "Amazing Grace", artist: "Judy Collins", durationSec: 234 };
const app = { appId: "openchords-test", apiKey: "secret-test-key" };

function answering(response: Response) {
  const requests: Request[] = [];
  const fetch = async (url: string, init: RequestInit) => {
    requests.push(new Request(url, init));
    return response.clone();
  };
  return { source: lrclib({ fetch, ...app }), requests };
}

describe("the LRCLIB source", () => {
  test("answers the words of her song, line by line, with where they came from", async () => {
    const { source } = answering(Response.json(amazingGrace));
    const lyrics = await source.lyricsFor(judyCollins);
    expect(lyrics?.lines.slice(0, 5)).toEqual([
      "Amazing grace, how sweet the sound",
      "That saved a wretch like me",
      "I once was lost, but now I'm found",
      "Was blind but now I see",
      "Through many dangers, toils and snares",
    ]);
    expect(lyrics?.provenance).toMatchObject({ source: "lrclib", recordId: "19200992", licence: "lrclib-api" });
  });

  test("asks by title, artist and duration as the registered OpenChords app", async () => {
    const { source, requests } = answering(Response.json(amazingGrace));
    await source.lyricsFor(judyCollins);
    const [request] = requests;
    expect(Object.fromEntries(new URL(request!.url).searchParams)).toEqual({ track_name: "Amazing Grace", artist_name: "Judy Collins", duration: "234" });
    expect(request?.headers.get("Lrclib-App-Id")).toBe(app.appId);
    expect(request?.headers.get("Lrclib-Api-Key")).toBe(app.apiKey);
    expect(request?.headers.get("User-Agent")).toStartWith("OpenChords/");
  });

  test("a record more than 2 seconds longer or shorter is another recording", async () => {
    const { source } = answering(Response.json({ ...amazingGrace, duration: 236.5 }));
    expect(await source.lyricsFor(judyCollins)).toBeNull();
  });

  test("a song without a known duration gets no guess", async () => {
    const { source, requests } = answering(Response.json(amazingGrace));
    expect(await source.lyricsFor({ title: "Amazing Grace", artist: "Judy Collins" })).toBeNull();
    expect(requests).toHaveLength(0);
  });

  test.each([
    ["no record", new Response(JSON.stringify({ name: "TrackNotFound" }), { status: 404 })],
    ["an instrumental", Response.json({ ...amazingGrace, instrumental: true, plainLyrics: null })],
  ])("%s has no words", async (_, response) => {
    const { source } = answering(response);
    expect(await source.lyricsFor(judyCollins)).toBeNull();
  });

  test.each([429, 503])("a busy LRCLIB (%i) says when to try again", async (status) => {
    const { source } = answering(new Response("busy", { status, headers: { "Retry-After": "3" } }));
    const busy = source.lyricsFor(judyCollins);
    await expect(busy).rejects.toBeInstanceOf(SourceUnavailable);
    await expect(busy).rejects.toMatchObject({ retryAfterMs: 3000 });
  });
});
