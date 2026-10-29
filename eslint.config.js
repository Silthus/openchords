import js from "@eslint/js";
import tseslint from "typescript-eslint";

const contexts = ["catalog", "sources", "library", "access", "sheet"];

const deepImportIntoAnotherContext = `^(\\.\\./)+(.*/)?(${contexts.join("|")})/(?!index$).+`;

export default tseslint.config(
  { ignores: ["dist", "convex/_generated", "src/app/routeTree.gen.ts"] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: deepImportIntoAnotherContext,
              message: "Import another context through its public index.ts only.",
            },
          ],
        },
      ],
    },
  },
);
