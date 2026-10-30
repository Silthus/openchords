import { convexTest, type TestConvex } from "convex-test";
import { dirname } from "node:path";
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
