import { afterEach, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { testBackend } from "../testing.helper";

type Backend = ReturnType<typeof testBackend>;

const convexDir = join(import.meta.dir, "..");
const signInFunctions = "auth.ts";

const signedOutCalls: Record<string, (backend: Backend, songId: Id<"songs">) => Promise<unknown>> = {
  "catalog/index:builtIns": (backend) => backend.query(api.catalog.index.builtIns, {}),
  "catalog/index:search": (backend) => backend.query(api.catalog.index.search, { query: "Rising" }),
  "catalog/index:song": (backend, songId) => backend.query(api.catalog.index.song, { songId }),
  "catalog/index:open": (backend, songId) => backend.mutation(api.catalog.index.open, { songId }),
};

afterEach(() => {
  delete process.env.OPENCHORDS_INVITES;
});

function isPublicFunction(exported: unknown) {
  return typeof exported === "function" && (exported as { isPublic?: boolean }).isPublic === true;
}

async function publicFunctionNames() {
  const names: string[] = [];
  const files = [...new Bun.Glob("**/*.ts").scanSync(convexDir)].filter(
    (path) => !path.startsWith("_generated/") && !/\.(test|helper|d|config)\.ts$/.test(path) && path !== signInFunctions,
  );
  for (const path of files) {
    const exports: Record<string, unknown> = await import(join(convexDir, path));
    for (const [name, exported] of Object.entries(exports)) {
      if (isPublicFunction(exported)) names.push(`${path.replace(/\.ts$/, "")}:${name}`);
    }
  }
  return names.sort();
}

async function aSongId(backend: Backend) {
  await backend.mutation(internal.catalog.index.seed, {});
  const songs = await backend.run((ctx) => ctx.db.query("songs").take(1));
  return songs[0]!._id;
}

describe("every public function outside sign-in", () => {
  test("is called here signed out", async () => {
    expect(Object.keys(signedOutCalls).sort()).toEqual(await publicFunctionNames());
  });

  test.each(Object.entries(signedOutCalls))("%s asks a signed-out visitor to sign in while invites are on", async (_name, call) => {
    process.env.OPENCHORDS_INVITES = "on";
    const backend = testBackend();
    const songId = await aSongId(backend);
    await expect(call(backend, songId)).rejects.toThrow(/SIGN_IN_REQUIRED/);
  });
});
