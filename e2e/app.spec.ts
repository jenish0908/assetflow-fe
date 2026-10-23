import { expect, test, type Page } from "@playwright/test";

// Needs the demo accounts from assetflow-be (scripts/demo.sh, or the README
// quickstart's adduser commands) and BILLING_MODE=fake for the payment test.

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/signin");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
}

const admin = () => ["admin@assetflow.dev", "admin-pass-123"] as const;
const viewer = () => ["priya@assetflow.dev", "priya-pass-123"] as const;

test("an admin adds an asset, allocates it, and the worker delivers the notification", async ({ page }) => {
  const tag = `E2E-${Date.now().toString().slice(-6)}`;
  await signIn(page, ...admin());

  await page.getByRole("link", { name: "Assets", exact: true }).click();
  await page.getByRole("button", { name: "Add asset" }).click();
  const add = page.getByRole("dialog");
  await add.getByLabel("Tag").fill(tag);
  await add.getByLabel("Name").fill("Playwright test laptop");
  await add.getByRole("button", { name: "Add asset" }).click();

  // Lands on the new asset's page.
  await expect(page.getByRole("heading", { name: "Playwright test laptop" })).toBeVisible();
  await expect(page.getByText("Never allocated")).toBeVisible();

  await page.getByRole("button", { name: "Allocate" }).click();
  const allocate = page.getByRole("dialog");
  await allocate.getByRole("searchbox").fill("priya");
  await allocate.getByRole("option", { name: /Priya Shah/ }).click();
  await allocate.getByRole("button", { name: "Allocate to Priya Shah" }).click();

  await expect(page.getByText(`${tag} allocated to Priya Shah`)).toBeVisible(); // toast
  await expect(page.getByText("Has it now")).toBeVisible();
  await expect(page.locator(".detail-meta").getByText("Allocated")).toBeVisible();

  // The allocation wrote an outbox job; the worker sends it within seconds.
  await page.getByRole("link", { name: "Notifications" }).click();
  const row = page.getByRole("listitem").filter({ hasText: `${tag} allocated to Priya Shah` });
  await expect(row.getByText("Delivered")).toBeVisible({ timeout: 15_000 });
});

test("search and status filters narrow the asset list and survive a reload", async ({ page }) => {
  await signIn(page, ...admin());
  await page.goto("/assets");
  await page.getByRole("button", { name: "Retired" }).click();
  await expect(page).toHaveURL(/status=retired/);
  const rows = page.locator("tbody tr");
  await expect(rows.first()).toContainText("Retired");

  await page.reload();
  await expect(page.getByRole("button", { name: "Retired" })).toHaveAttribute("aria-pressed", "true");
});

test("a payment can be made once, and shows as paid", async ({ page }) => {
  await signIn(page, ...viewer());
  await page.getByRole("link", { name: "Payments" }).click();
  await expect(page.getByText(/Test mode/)).toBeVisible();

  await page.getByRole("button", { name: "New payment" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Amount").fill("12.34");
  await dialog.getByRole("button", { name: /Pay/ }).click();

  await expect(page.getByText(/Paid .*12\.34/)).toBeVisible();
  await expect(page.locator("tbody tr").first()).toContainText("Paid");
});

test("the assistant refuses actions the viewer may not take", async ({ page }) => {
  await signIn(page, ...viewer());
  await page.getByRole("link", { name: "Assistant" }).click();
  await page.getByLabel("Message the assistant").fill("allocate laptop L-102 to Priya");
  await page.getByRole("button", { name: "Send" }).click();

  await expect(page.getByText(/permission denied/).first()).toBeVisible();
});

test("viewers do not see management actions", async ({ page }) => {
  await signIn(page, ...viewer());
  await page.goto("/assets");
  await expect(page.getByRole("button", { name: "Add asset" })).toHaveCount(0);
  await page.locator("tbody tr").first().click();
  await expect(page.getByRole("heading", { name: "Allocation history" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Change status" })).toHaveCount(0);
});

test("the layout has no sideways scrolling on a phone @mobile", async ({ page }) => {
  await signIn(page, ...admin());
  for (const path of ["/", "/assets", "/people", "/payments", "/notifications", "/assistant"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `horizontal overflow on ${path}`).toBeLessThanOrEqual(0);
  }
});

test("every page passes an automated accessibility audit", async ({ page }) => {
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  const audit = async (name: string) => {
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const serious = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`), `accessibility on ${name}`).toEqual([]);
  };

  await page.goto("/signin");
  await audit("sign in");
  await signIn(page, ...admin());
  for (const path of ["/", "/assets", "/assets/1", "/people", "/payments", "/notifications", "/assistant"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await audit(path);
  }
});
