import type { Page } from "@playwright/test";

/**
 * Comptes du dataset isolé déterministe (scripts/isolated-env/reset-and-seed.js)
 * — jamais de donnée réelle. Les trois "Joueur" partagent le même prénom
 * affiché ; désambiguïsés par leurs initiales (visibles dans le bouton du
 * sélecteur de profil).
 */
export const SEED_ACCOUNTS = {
  owner: { initials: "PT", pin: "919191" },
  coach: { initials: "CT", pin: "828282" },
  player1: { initials: "JU", pin: "1111" },
  player2: { initials: "JD", pin: "2222" },
  player3: { initials: "JT", pin: "3333" },
} as const;

export type SeedAccountKey = keyof typeof SEED_ACCOUNTS;

/** Connexion réelle via le pavé PIN (jamais un contournement de session) — roadmap V3, §2.1. */
export async function loginAs(page: Page, accountKey: SeedAccountKey) {
  const account = SEED_ACCOUNTS[accountKey];
  await page.goto("/login");
  await page.getByRole("button", { name: new RegExp(account.initials) }).click();
  for (const digit of account.pin) {
    await page.getByRole("button", { name: digit, exact: true }).click();
  }
  await page.waitForURL("/", { timeout: 10_000 });
}

export async function logout(page: Page) {
  await page.goto("/plus");
  await page.getByRole("button", { name: /^Déconnexion$/ }).click();
  await page.waitForURL("/login");
}
