import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { expectHomePage, shoot, signUp } from "./helpers";

async function expectNoA11yViolation(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

// US-04: the pseudo and the illustrations change; the e-mail never does.
test("changes the pseudo and the illustrations of the profile", async ({
  page,
}) => {
  const username = await signUp(page);
  await page.getByRole("button", { name: "Commencer" }).click();
  await expectHomePage(page);

  // PRF-01
  await page.goto("/profil");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Mon profil",
  );
  await expect(page.getByText(username, { exact: true })).toBeVisible();
  await shoot(page, "prf-01-mon-profil");
  await expectNoA11yViolation(page);

  // PRF-02: "Enregistrer" waits for a change
  await page.getByRole("link", { name: "Modifier le profil" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Modifier le profil",
  );
  await expect(
    page.getByRole("button", { name: "Enregistrer" }),
  ).toBeDisabled();
  await expect(page.getByText("E-mail · non modifiable")).toBeVisible();

  await page.getByRole("radio", { name: "Homme" }).click();
  await page.getByLabel(/^Pseudo/).fill(`${username}_v2`);
  await shoot(page, "prf-02-modifier-le-profil");
  await expectNoA11yViolation(page);
  await page.getByRole("button", { name: "Enregistrer" }).click();

  // PRF-02s: back on the profile, with the message
  await expect(page.getByText("✓ Profil enregistré.")).toBeVisible();
  await expect(page.getByText(`${username}_v2`, { exact: true })).toBeVisible();
  await expect(page.getByText("Homme")).toBeVisible();

  // PRF-05: the illustrations, with an example
  await page.getByRole("button", { name: /Illustrations d'exercice/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Illustrations",
  );
  await expect(page.getByRole("radio", { name: "Homme" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await page.getByRole("radio", { name: "Femme" }).click();
  await expect(page.getByRole("radio", { name: "Femme" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await shoot(page, "prf-05-illustrations");
  await expectNoA11yViolation(page);

  // The choice is kept after a reload (it lives on the server)
  await page.reload();
  await expect(page.getByRole("radio", { name: "Femme" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
});
