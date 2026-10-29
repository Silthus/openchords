import { convexTest } from "convex-test";
import schema from "./schema";

const convexDir = import.meta.dir;

const modules = Object.fromEntries(
  [...new Bun.Glob("**/*.{ts,js}").scanSync(convexDir)]
    .filter((path) => !path.endsWith(".d.ts") && !/\.(test|helper)\.ts$/.test(path))
    .map((path) => [`./${path}`, () => import(`${convexDir}/${path}`)]),
);

export function testBackend() {
  return convexTest(schema, modules);
}

export async function testBackendWith(env: Record<string, string>) {
  Object.assign(process.env, env);
  const authLoadedWithEnv = `${convexDir}/auth.ts?${new URLSearchParams(env)}`;
  await import(authLoadedWithEnv);
  return convexTest(schema, { ...modules, "./auth.ts": () => import(authLoadedWithEnv) });
}
