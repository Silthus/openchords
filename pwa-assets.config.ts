import { defineConfig, minimal2023Preset } from "@vite-pwa/assets-generator/config";

const fullBleed = { resizeOptions: { background: "#ea580c" } };

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, ...fullBleed },
    apple: { ...minimal2023Preset.apple, ...fullBleed },
  },
  images: ["public/favicon.svg"],
});
