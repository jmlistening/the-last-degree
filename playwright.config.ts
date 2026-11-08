import { defineConfig } from "@playwright/test";
const port = Number(process.env.PLAYWRIGHT_PORT ?? 4173);
const baseURL = `http://127.0.0.1:${port}`;
export default defineConfig({
  testDir: "./e2e",
  timeout: 90000,
  workers: 1,
  use: {
    baseURL,
    viewport: { width: 1360, height: 840 },
    channel: process.env.CI ? undefined : "msedge",
    launchOptions: {
      args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
    },
  },
  webServer: {
    command: `pnpm preview --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
  },
});
