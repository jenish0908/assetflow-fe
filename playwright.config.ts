import { defineConfig, devices } from "@playwright/test";

// End-to-end tests run against a real stack: assetflow-be's API, worker and
// Postgres (with its demo accounts), behind this UI. Point BASE_URL at the
// UI, e.g. the dev server (5180) or `npm run preview` (4173).
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false, // tests share one database
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:5180",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, grepInvert: /@mobile/ },
    { name: "phone", use: { ...devices["Pixel 7"] }, grep: /@mobile/ },
  ],
});
