/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

interface ImportMetaEnv {
  readonly VITE_CONVEX_URL: string;
  readonly VITE_TEST_SIGN_IN?: "1";
}
