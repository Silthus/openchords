import { describe, expect, test } from "bun:test";
import { SourceUnavailable } from "..";
import { musicbrainz } from ".";
import ringOfFire from "../../fixtures/musicbrainzRingOfFire.json";

function answering(response: Response) {
  const requests: Request[] = [];
  const fetch = async (url: string, init: RequestInit) => {
    requests.push(new Request(url, init));
    return response.clone();
  };
  return { fetch, requests };
}

function recording(title: string, artist: string, length: number) {
  return { id: crypto.randomUUID(), title, length, "artist-credit": [{ name: artist }] };
}

describe("the MusicBrainz source", () => {
  test("folds every recording of a song into one Song, with the duration most recordings share", async () => {
    const { fetch } = answering(Response.json(ringOfFire));
    expect(await musicbrainz(fetch).findSongs("ring of fire johnny cash")).toEqual([
      { title: "Ring of Fire", artist: "Johnny Cash", durationSec: 156 },
    ]);
  });

  test("a title written in another case or with accents is the same song", async () => {
    const { fetch } = answering(
      Response.json({
        recordings: [
          recording("Ring Of Fire", "Johnny Cash", 157000),
          recording("ring of fire", "Johnny Cash", 157000),
          recording("Pájaro", "Lhasa", 200000),
          recording("Pajaro", "Lhasa", 200000),
        ],
      }),
    );
    const songs = await musicbrainz(fetch).findSongs("fire");
    expect(songs.map((song) => song.title)).toEqual(["Ring Of Fire", "Pájaro"]);
  });

  test("names OpenChords and searches titles and artists for the words she typed", async () => {
    const { fetch, requests } = answering(Response.json({ recordings: [] }));
    await musicbrainz(fetch).findSongs('AC/DC: "Back in Black"');
    const [request] = requests;
    expect(request?.headers.get("User-Agent")).toMatch(/^OpenChords\/\S+ \( https:\/\/github\.com\/Silthus\/openchords \)$/);
    expect(new URL(request!.url).searchParams.get("query")).toEndWith("OR recording:(ac dc back in black) OR artist:(ac dc back in black)");
  });

  test("asks first for the recordings whose title and artist hold every word she typed", async () => {
    const { fetch, requests } = answering(Response.json({ recordings: [] }));
    await musicbrainz(fetch).findSongs("Cranberries Zombie");
    expect(new URL(requests[0]!.url).searchParams.get("query")).toStartWith(
      "((recording:cranberries OR artist:cranberries) AND (recording:zombie OR artist:zombie))^4 OR ",
    );
  });

  test("asks for as many recordings as MusicBrainz gives at once, those titled with her very words weighed most", async () => {
    const { fetch, requests } = answering(Response.json({ recordings: [] }));
    await musicbrainz(fetch).findSongs("Ring of Fire");
    const params = new URL(requests[0]!.url).searchParams;
    expect(params.get("query")).toContain(' OR recording:"ring of fire"^8 OR ');
    expect(params.get("limit")).toBe("100");
  });

  test("an AND she types is a word, not an operator", async () => {
    const { fetch, requests } = answering(Response.json({ recordings: [] }));
    await musicbrainz(fetch).findSongs("Simon AND Garfunkel");
    const query = new URL(requests[0]!.url).searchParams.get("query");
    expect(query).toContain("(recording:and OR artist:and)");
    expect(query).toEndWith("recording:(simon and garfunkel) OR artist:(simon and garfunkel)");
  });

  test("a busy MusicBrainz says when to try again", async () => {
    const { fetch } = answering(new Response("busy", { status: 503, headers: { "Retry-After": "2" } }));
    const busy = musicbrainz(fetch).findSongs("ring of fire");
    await expect(busy).rejects.toBeInstanceOf(SourceUnavailable);
    await expect(busy).rejects.toMatchObject({ retryAfterMs: 2000 });
  });
});
