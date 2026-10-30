import { afterEach, describe, expect, test } from "bun:test";
import { api, internal } from "../_generated/api";
import { invitedReader, testBackend } from "../testing.helper";

afterEach(() => {
  delete process.env.OPENCHORDS_INVITES;
});

async function builtInSongs() {
  const backend = testBackend();
  await backend.mutation(internal.catalog.index.seed, {});
  const reader = await invitedReader(backend);
  const songs = await reader.query(api.catalog.index.builtIns, {});
  const idOf = (title: string) => songs.find((song) => song.title === title)!.songId;
  return { backend, reader, idOf };
}

describe("the Songs of her Library", () => {
  test("come with their title and artist, in the order she asks for them", async () => {
    const { reader, idOf } = await builtInSongs();
    const songIds = [idOf("Shenandoah"), idOf("Amazing Grace")];
    expect(await reader.query(api.catalog.index.summaries, { songIds })).toEqual([
      { songId: idOf("Shenandoah"), title: "Shenandoah", artist: "Traditional" },
      { songId: idOf("Amazing Grace"), title: "Amazing Grace", artist: "John Newton" },
    ]);
  });

  test("leave out a Song that was taken down", async () => {
    const { backend, reader, idOf } = await builtInSongs();
    await backend.mutation(internal.catalog.takedown.song, { songId: idOf("Shenandoah") });
    const summaries = await reader.query(api.catalog.index.summaries, { songIds: [idOf("Shenandoah"), idOf("Amazing Grace")] });
    expect(summaries.map((song) => song.title)).toEqual(["Amazing Grace"]);
  });
});
