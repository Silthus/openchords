import js from "@eslint/js";
import tseslint from "typescript-eslint";

const contexts = ["catalog", "sources", "library", "access", "sheet"];

const deepImportIntoAnotherContext = `^(\\.\\.?/)+(.*/)?(${contexts.join("|")})/(?!index(\\.tsx?)?$).+`;

const importsThroughPublicFiles = {
  regex: deepImportIntoAnotherContext,
  message: "Import another context through its public index.ts only.",
};

const signOutThroughUseSignOut = {
  name: "@convex-dev/auth/react",
  importNames: ["useAuthActions"],
  message: "Sign out through useSignOut, which also takes her Songs off the phone.",
};

export default tseslint.config(
  { ignores: ["dist", "convex/_generated", "src/app/routeTree.gen.ts"] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      "no-restricted-imports": ["error", { paths: [signOutThroughUseSignOut], patterns: [importsThroughPublicFiles] }],
    },
  },
  {
    files: ["src/app/signIn/useSignOut.ts", "src/app/signIn/SignInScreen.tsx"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [importsThroughPublicFiles] }],
    },
  },
);
