import { test, expect } from "@playwright/test";
import { loginAs } from "./fixtures";

/**
 * Roadmap V3, protocole macro-releases §2.1 — socle Playwright réutilisable :
 * login des trois rôles fictifs et permissions de base. Projet isolé
 * exclusivement (voir playwright.config.ts).
 */

test("login Joueur — accès à l'accueil, pas d'entrée de gestion d'équipe", async ({ page }) => {
  await loginAs(page, "player1");
  await expect(page.getByText("Bienvenue sur l'espace")).toBeVisible();
  await page.goto("/plus");
  await expect(page.getByRole("link", { name: /Gestion de l'équipe/i })).toHaveCount(0);
});

test("login Coach — accès à l'accueil, entrée de gestion d'équipe visible", async ({ page }) => {
  await loginAs(page, "coach");
  await expect(page.getByText("Bienvenue sur l'espace")).toBeVisible();
  await page.goto("/plus");
  await expect(page.getByRole("link", { name: /Gestion de l'équipe/i })).toBeVisible();
});

test("login Propriétaire — accès à l'accueil, entrée de gestion d'équipe et de coachs visible", async ({ page }) => {
  await loginAs(page, "owner");
  await expect(page.getByText("Bienvenue sur l'espace")).toBeVisible();
  await page.goto("/plus");
  await expect(page.getByRole("link", { name: /Gestion de l'équipe/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Gestion des coachs/i })).toBeVisible();
});

test("aucune page principale ne répond en erreur serveur (HTTP 500)", async ({ page }) => {
  await loginAs(page, "owner");
  for (const path of ["/", "/matches", "/stats", "/team", "/plus"]) {
    const response = await page.goto(path);
    expect(response?.status(), `${path} ne doit jamais répondre 500`).toBeLessThan(500);
  }
});
