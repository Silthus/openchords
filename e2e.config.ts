import { web } from "@e2e-dev/web";
import type { E2EConfig } from "e2e";
import { chatgpt } from "e2e/oauth/chatgpt";

export default {
  agents: { default: { model: chatgpt("gpt-6-luna") } },
  targets: [
    {
      name: "phone",
      engine: web({ viewport: { width: 390, height: 844 } }),
      app: {
        url: process.env.APP_URL ?? "http://localhost:5173",
        command: { executable: "bun", args: ["run", "dev"], reuseExisting: true, log: ".e2e/logs/app.log" },
      },
    },
  ],
} satisfies E2EConfig;
