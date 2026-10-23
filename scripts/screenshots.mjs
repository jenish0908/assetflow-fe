// Captures every page of a running AssetFlow (dev server or Docker) into
// docs/screenshots/. Used for the README and for reviewing the design.
//
//   BASE_URL=http://localhost:5180 node scripts/screenshots.mjs
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const base = process.env.BASE_URL ?? "http://localhost:5180";
const out = fileURLToPath(new URL("../docs/screenshots/", import.meta.url));
await mkdir(out, { recursive: true });

const browser = await chromium.launch();

async function capture(viewport, suffix) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 2 });
  const shot = (name) => page.screenshot({ path: join(out, `${name}${suffix}.png`) });

  await page.goto(`${base}/signin`);
  await page.waitForTimeout(900); // let the label settle
  await shot("01-signin");

  await page.getByLabel("Email").fill("admin@assetflow.dev");
  await page.getByLabel("Password").fill("admin-pass-123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("heading", { name: "Overview" }).waitFor();
  await page.waitForLoadState("networkidle");
  await shot("02-overview");

  await page.getByRole("link", { name: "Assets", exact: true }).click();
  await page.getByRole("cell", { name: /L-101/ }).waitFor();
  await page.waitForLoadState("networkidle");
  await shot("03-assets");

  await page.getByRole("link", { name: "Asset L-101" }).click();
  await page.getByRole("heading", { name: "Allocation history" }).waitFor();
  await page.waitForLoadState("networkidle");
  await shot("04-asset-detail");

  await page.getByRole("link", { name: "People" }).click();
  await page.getByRole("cell", { name: /Priya Shah/ }).waitFor();
  await shot("05-people");

  await page.getByRole("link", { name: "Payments" }).click();
  await page.getByRole("heading", { name: "Payments" }).waitFor();
  await page.waitForLoadState("networkidle");
  await shot("06-payments");

  await page.getByRole("link", { name: "Notifications" }).click();
  await page.waitForLoadState("networkidle");
  await shot("07-notifications");

  await page.getByRole("link", { name: "Assistant" }).click();
  await page.getByRole("button", { name: "show L-102", exact: true }).click();
  await page.getByText(/L-102 \(/).waitFor();
  await shot("08-assistant");

  await page.close();
}

await capture({ width: 1440, height: 900 }, "");
await capture({ width: 390, height: 844 }, "-mobile");
await browser.close();
console.log("screenshots written to docs/screenshots/");
