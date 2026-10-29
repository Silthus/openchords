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
