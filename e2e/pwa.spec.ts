import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { expectHomePage, shoot, signUp } from "./helpers";

// US-45: without a network, the app shows its own screen instead of the
// error page of the browser. Nothing of the account is kept offline.
test("shows its own screen when the network is gone", async ({
  page,
  context,
}) => {
  await signUp(page);
  await page.getByRole("button", { name: "Commencer" }).click();
  await expectHomePage(page);

  await context.setOffline(true);
  const card = page.getByRole("alert");
  await expect(card).toContainText("Pas de connexion");
  await expect(card).toContainText(
    "Fulgora a besoin d'internet pour enregistrer tes séances.",
  );
  await expect(page.getByRole("button", { name: "Réessayer" })).toBeVisible();
  await shoot(page, "pwa-hors-connexion");
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);

  // The network comes back: the app comes back too, still connected
  await context.setOffline(false);
  await expectHomePage(page);
});

// The pieces a phone needs to install the app: the manifest, its icons
// and the colours of the charter.
test("serves a manifest a phone can install", async ({ page }) => {
  await page.goto("/");
  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  expect(href).not.toBeNull();

  const response = await page.request.get(href ?? "");
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  expect(manifest).toMatchObject({
    name: "Fulgora",
    display: "standalone",
    start_url: "/",
    theme_color: "#eceff3",
  });
  // One icon of 192 and one of 512, plus the maskable one of the phones
  const sizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes);
  expect(sizes).toContain("192x192");
  expect(sizes).toContain("512x512");
  expect(
    manifest.icons.some(
      (icon: { purpose?: string }) => icon.purpose === "maskable",
    ),
  ).toBe(true);

  for (const icon of manifest.icons) {
    const image = await page.request.get(icon.src);
    expect(image.ok()).toBe(true);
  }
});
