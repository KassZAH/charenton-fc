import { test, expect } from "@playwright/test";
import { loginAs } from "./fixtures";

/**
 * Charenton FC — Mode Démo (présentation aux coachs, post-Macro B). Scénario central : entrée
 * visible pour Coach/Propriétaire uniquement, bandeau MODE DÉMO sur les fiches de match
 * concernées, invisibilité pour un compte Joueur. Le dataset Démo lui-même est créé/nettoyé par
 * les tests d'intégration (demo-mode.integration.test.ts) — ce fichier vérifie seulement ce qui
 * ne peut l'être qu'en conditions réelles de navigateur (visibilité par rôle, rendu du bandeau).
 */

test.describe.configure({ mode: "serial" });

test("1. Joueur : aucune entrée « Mode Démo » visible dans le menu", async ({ page }) => {
  await loginAs(page, "player1");
  await page.goto("/plus");
  await expect(page.getByRole("link", { name: /Mode Démo/ })).toHaveCount(0);
});

test("2. Coach : entrée « Mode Démo » visible, page accessible", async ({ page }) => {
  await loginAs(page, "coach");
  await page.goto("/plus");
  await expect(page.getByRole("link", { name: /Mode Démo/ })).toBeVisible();
  await page.getByRole("link", { name: /Mode Démo/ }).click();
  await page.waitForURL("/demo");
  await expect(page.getByText(/MODE DÉMO/)).toBeVisible();
});

test("3. Joueur : accès direct à /demo refusé (redirection)", async ({ page }) => {
  await loginAs(page, "player1");
  const response = await page.goto("/demo");
  expect(response?.status()).toBeLessThan(500);
  await expect(page).toHaveURL("/");
});

test("4. Propriétaire : crée la démonstration puis voit les actions de gestion réservées", async ({ page }) => {
  await loginAs(page, "owner");
  await page.goto("/demo");

  // Aucune démonstration au démarrage de la suite E2E (dataset technique minimal, sans Mode Démo).
  const creationForm = page.locator('input[name="confirmation"]');
  if (await creationForm.count()) {
    await creationForm.fill("REINITIALISER DEMO");
    await page.getByRole("button", { name: /Créer la démonstration/ }).click();
  }

  await page.waitForURL("/demo");
  await expect(page.getByText(/Gestion \(Propriétaire\)/)).toBeVisible();
  await expect(page.getByText(/match\(s\) fictif\(s\)/)).toBeVisible();
});

test("5. Nettoyage — suppression complète de la démonstration créée par ce scénario", async ({ page }) => {
  await loginAs(page, "owner");
  await page.goto("/demo");
  await page.locator('form:has-text("SUPPRIMER DEMO") input[name="confirmation"]').fill("SUPPRIMER DEMO");
  await page.locator('form:has-text("SUPPRIMER DEMO") button[type="submit"]').click();
  await page.waitForURL("/demo");
  await expect(page.getByText(/Aucune démonstration n'a encore été créée/)).toBeVisible();
});
