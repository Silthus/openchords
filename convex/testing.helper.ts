import { convexTest, type TestConvex } from "convex-test";
import { dirname } from "node:path";
import { internal } from "./_generated/api";
import schema from "./schema";

const convexDir = import.meta.dir;

function modulesIn(dir: string, prefix = ".") {
  return Object.fromEntries(
    [...new Bun.Glob("**/*.{ts,js}").scanSync(dir)]
      .filter((path) => !path.endsWith(".d.ts") && !/\.(test|helper)\.ts$/.test(path))
      .map((path) => [`${prefix}/${path}`, () => import(`${dir}/${path}`)]),
  );
}

const modules = modulesIn(convexDir);

async function componentFrom(packageName: string) {
  const componentDir = `${dirname(Bun.resolveSync(`${packageName}/package.json`, convexDir))}/src/component`;
  const { default: componentSchema } = await import(`${componentDir}/schema.ts`);
  return { schema: componentSchema, modules: modulesIn(componentDir, "./component") };
}

const rateLimiter = await componentFrom("@convex-dev/rate-limiter");
const batchWorker = await componentFrom("@convex-dev/batch-worker");
const actionRetrier = await componentFrom("@convex-dev/action-retrier");

function withComponents(backend: TestConvex<typeof schema>) {
  backend.registerComponent("rateLimiter", rateLimiter.schema, rateLimiter.modules);
  backend.registerComponent("rateLimiter/batchWorker", batchWorker.schema, batchWorker.modules);
  backend.registerComponent("actionRetrier", actionRetrier.schema, actionRetrier.modules);
  return backend;
}

export function testBackend() {
  return withComponents(convexTest(schema, modules));
}

export async function testBackendWith(env: Record<string, string>) {
  Object.assign(process.env, env);
  const authLoadedWithEnv = `${convexDir}/auth.ts?${new URLSearchParams(env)}`;
  await import(authLoadedWithEnv);
  return withComponents(convexTest(schema, { ...modules, "./auth.ts": () => import(authLoadedWithEnv) }));
}

const anna = { email: "anna@example.com", name: "Anna Berg" };

export async function invitedReader(backend: TestConvex<typeof schema>, person = anna) {
  await backend.mutation(internal.access.invites.add, { email: person.email });
  const subject = await backend.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { ...person, emailVerificationTime: Date.now() });
    const sessionId = await ctx.db.insert("authSessions", { userId, expirationTime: Date.now() + 60 * 60 * 1000 });
    return `${userId}|${sessionId}`;
  });
  return backend.withIdentity({ subject });
}
