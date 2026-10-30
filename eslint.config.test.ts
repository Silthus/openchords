import { describe, expect, test } from "bun:test";
import { ESLint } from "eslint";

const eslint = new ESLint();

async function restrictedImportErrors(importer: string, code: string) {
  const results = await eslint.lintText(code, { filePath: importer });
  return results.flatMap((result) => result.messages).filter((message) => message.ruleId === "no-restricted-imports");
}

const deepImportErrors = (importer: string, specifier: string) => restrictedImportErrors(importer, `import "${specifier}";\n`);

const authActionErrors = (importer: string) =>
  restrictedImportErrors(importer, `import { useAuthActions } from "@convex-dev/auth/react";\nuseAuthActions();\n`);

describe("a context is reached only through its public file", () => {
  test.each([
    ["src/app/routes/index.tsx", "../../sheet/parse"],
    ["src/app/routes/songs/$songId.tsx", "../../../library/useLibraryEntry"],
    ["convex/library/index.ts", "../catalog/schema"],
    ["convex/catalog/index.ts", "../sources/builtIn/songs"],
    ["convex/catalog/fill.ts", "../../src/sheet/compose"],
    ["convex/http.ts", "./library/schema"],
    ["src/app/main.tsx", "../sheet/parse.ts"],
  ])("%s may not import %s", async (importer, specifier) => {
    expect(await deepImportErrors(importer, specifier)).toHaveLength(1);
  });

  test.each([
    ["src/app/routes/index.tsx", "../../sheet"],
    ["src/app/routes/index.tsx", "../../sheet/index"],
    ["src/app/routes/index.tsx", "../../sheet/index.ts"],
    ["convex/schema.ts", "./catalog"],
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

describe("every sign-out takes her Songs off the phone", () => {
  test.each(["src/app/signIn/ReadingRefused.tsx", "src/app/signIn/SignOutButton.tsx", "src/app/routes/index.tsx"])(
    "%s signs out only through useSignOut",
    async (importer) => {
      expect(await authActionErrors(importer)).toHaveLength(1);
    },
  );

  test.each(["src/app/signIn/useSignOut.ts", "src/app/signIn/SignInScreen.tsx"])("%s may use the auth actions", async (importer) => {
    expect(await authActionErrors(importer)).toHaveLength(0);
  });
});
