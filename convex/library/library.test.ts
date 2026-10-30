import { afterEach, describe, expect, setSystemTime, test } from "bun:test";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { testBackend } from "../testing.helper";

type Backend = ReturnType<typeof testBackend>;

const anna = { email: "anna@example.com", name: "Anna Berg" };
const ben = { email: "ben@example.com", name: "Ben Ott" };

afterEach(() => {
  delete process.env.OPENCHORDS_INVITES;
  setSystemTime();
});

async function seeded() {
  const backend = testBackend();
  await backend.mutation(internal.catalog.index.seed, {});
  await backend.finishAllScheduledFunctions(() => {});
  return backend;
}

async function signedIn(backend: Backend, person: { email: string; name: string }) {
  await backend.mutation(internal.access.invites.add, { email: person.email });
  const subject = await backend.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { ...person, emailVerificationTime: Date.now() });
    const sessionId = await ctx.db.insert("authSessions", { userId, expirationTime: Date.now() + 60 * 60 * 1000 });
    return `${userId}|${sessionId}`;
  });
  return backend.withIdentity({ subject });
}

async function aSheet(backend: Backend) {
  const [sheet] = await backend.run((ctx) => ctx.db.query("chordSheets").take(1));
  return { songId: sheet!.songId, chordSheetId: sheet!._id };
}

function choices(sheet: { songId: Id<"songs">; chordSheetId: Id<"chordSheets"> }, changed: Partial<{ transpose: number; capo: number; speed: number; saved: boolean }> = {}) {
  return { ...sheet, transpose: 0, capo: 0, speed: 3, saved: false, ...changed };
}

describe("her Library", () => {
  test("keeps one entry per Song with her latest choices", async () => {
    const backend = await seeded();
    const sheet = await aSheet(backend);
    const her = await signedIn(backend, anna);
    await her.mutation(api.library.index.save, choices(sheet, { transpose: 2 }));
    await her.mutation(api.library.index.save, choices(sheet, { transpose: 2, capo: 3, speed: 5 }));
    expect(await her.query(api.library.index.entries, {})).toEqual([
      expect.objectContaining({ ...sheet, transpose: 2, capo: 3, speed: 5, saved: false }),
    ]);
  });

  test("lets her latest write win, stamped with the server's time", async () => {
    const backend = await seeded();
    const sheet = await aSheet(backend);
    const her = await signedIn(backend, anna);
    setSystemTime(new Date("2026-10-30T08:00:00Z"));
    await her.mutation(api.library.index.save, choices(sheet, { speed: 8 }));
    setSystemTime(new Date("2026-10-30T09:00:00Z"));
    await her.mutation(api.library.index.save, choices(sheet, { speed: 2 }));
    expect(await her.query(api.library.index.entries, {})).toEqual([
      expect.objectContaining({ speed: 2, updatedAt: Date.parse("2026-10-30T09:00:00Z") }),
    ]);
  });

  test("keeps another person's entries out of hers", async () => {
    const backend = await seeded();
    const sheet = await aSheet(backend);
    const her = await signedIn(backend, anna);
    const him = await signedIn(backend, ben);
    await him.mutation(api.library.index.save, choices(sheet, { transpose: -3 }));
    expect(await her.query(api.library.index.entries, {})).toEqual([]);
    await her.mutation(api.library.index.save, choices(sheet, { transpose: 1 }));
    expect(await him.query(api.library.index.entries, {})).toEqual([expect.objectContaining({ transpose: -3 })]);
  });

  test("is empty for a signed-out visitor while invites are off", async () => {
    const backend = await seeded();
    expect(await backend.query(api.library.index.entries, {})).toEqual([]);
  });

  test("asks a signed-out visitor to sign in before saving, even while invites are off", async () => {
    const backend = await seeded();
    const sheet = await aSheet(backend);
    await expect(backend.mutation(api.library.index.save, choices(sheet))).rejects.toThrow(/SIGN_IN_REQUIRED/);
  });
});
