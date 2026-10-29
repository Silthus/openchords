import { describe, expect, test } from "bun:test";
import { ESLint } from "eslint";

const eslint = new ESLint();

async function deepImportErrors(importer: string, specifier: string) {
  const results = await eslint.lintText(`import "${specifier}";\n`, { filePath: importer });
  return results.flatMap((result) => result.messages).filter((message) => message.ruleId === "no-restricted-imports");
}

describe("a context is reached only through its public file", () => {
  test.each([
    ["src/app/routes/index.tsx", "../../sheet/parse"],
    ["src/app/routes/songs/$songId.tsx", "../../../library/useLibraryEntry"],
    ["convex/library/index.ts", "../catalog/schema"],
    ["convex/catalog/index.ts", "../sources/builtIn/songs"],
    ["convex/catalog/fill.ts", "../../src/sheet/compose"],
  ])("%s may not import %s", async (importer, specifier) => {
    expect(await deepImportErrors(importer, specifier)).toHaveLength(1);
  });

  test.each([
    ["src/app/routes/index.tsx", "../../sheet"],
    ["src/app/routes/index.tsx", "../../sheet/index"],
    ["src/app/routes/index.tsx", "../../../convex/_generated/api"],
    ["convex/catalog/index.ts", "../sources"],
    ["convex/catalog/index.ts", "../_generated/server"],
    ["convex/catalog/fill.ts", "../../src/sheet"],
    ["convex/sources/builtIn/index.ts", "./songs"],
    ["convex/sources/builtIn/index.ts", "../index"],
  ])("%s may import %s", async (importer, specifier) => {
    expect(await deepImportErrors(importer, specifier)).toHaveLength(0);
  });
});
