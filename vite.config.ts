import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: process.env.PROTOTYPE_BASE ?? "/",
  plugins: [react(), tailwindcss()],
  preview: { allowedHosts: [".coder.dev.posthog.dev"] },
});
