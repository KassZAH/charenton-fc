import { test, expect } from "@playwright/test";
import { loginAs } from "./fixtures";

/**
 * Roadmap V3, Macro-release B (protocole §8.2) — scénario métier central "Organisation
 * d'équipe" : terrain + modèle → match généré, restriction coach, covoiturage avec
 * affectation, matériel avec statuts, checklist privée. Un seul match fictif créé et nettoyé
 * par ce fichier ; projet isolé exclusivement (voir playwright.config.ts).
 */

test.describe.configure({ mode: "serial" });

let matchId: string;
// Suffixe aléatoire : mobile et desktop partagent le même dataset isolé sans reset entre les deux
// projets au sein d'un même run — sans ce suffixe, le second projet à s'exécuter trouverait déjà
// un terrain/modèle du même nom créé par le premier (trouvé par le gate complet de fin de macro).
const runSuffix = Math.random().toString(36).slice(2, 8);
const venueName = `Terrain E2E Macro B ${runSuffix}`;
const templateName = `Modèle E2E Macro B ${runSuffix}`;

test("1. Coach crée un terrain puis un modèle de match", async ({ page }) => {
  await loginAs(page, "coach");

  await page.goto("/admin/terrains");
  await page.locator('input[name="name"]').fill(venueName);
  await page.locator('input[name="address"]').fill("1 rue du Test");
  await page.getByRole("button", { name: "Créer" }).click();
  await expect(page.locator("li", { hasText: venueName }).first()).toBeVisible();

  await page.goto("/admin/modeles");
  await page.locator('input[name="name"]').fill(templateName);
  await page.locator('select[name="venue_id"]').selectOption({ label: venueName });
  await page.locator('input[name="kickoff_time"]').fill("20:00");
  await page.getByRole("button", { name: "Créer le modèle" }).click();
  await expect(page.locator("li", { hasText: templateName }).first()).toBeVisible();
});

test("2. Coach génère un match depuis le modèle", async ({ page }) => {
  await loginAs(page, "coach");
  await page.goto("/admin/modeles");

  const templateRow = page.locator("li", { hasText: templateName });
  const inSevenDays = new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10);
  await templateRow.locator('input[name="match_date"]').fill(inSevenDays);
  await templateRow.getByRole("button", { name: "Générer" }).click();
  await page.waitForURL(/\/matches\/[0-9a-f-]+$/);
  matchId = page.url().split("/matches/")[1];
  expect(matchId).toBeTruthy();
  await expect(page.getByText(venueName)).toBeVisible();
});

test("3. Coach crée une restriction pour un joueur (jamais un blocage), puis la clôture", async ({ page }) => {
  await loginAs(page, "coach");
  await page.goto("/team");
  await page.locator('a[href^="/team/"]:not([href="/team/new"]):not([href^="/team/compare"])').first().click();
  await page.waitForURL(/\/team\/[0-9a-f-]{8}-[0-9a-f-]+$/);

  // Une restriction active d'un run précédent (autre projet, même dataset isolé partagé sans
  // reset entre mobile et desktop) peut déjà exister — la clôturer d'abord pour repartir propre.
  const closeButton = page.getByRole("button", { name: "Clôturer la restriction" });
  if (await closeButton.isVisible().catch(() => false)) {
    await closeButton.click();
    await expect(page.getByRole("button", { name: "+ Créer une restriction" })).toBeVisible();
  }

  await page.getByRole("button", { name: "+ Créer une restriction" }).click();
  await page.locator('input[value="progressive_return"]').check();
  await page.getByRole("button", { name: "Créer", exact: true }).click();
  // Scopé au bandeau de restriction active (pas à l'historique, qui peut déjà contenir une
  // entrée "Retour progressif" clôturée par un run précédent sur le même joueur).
  await expect(page.getByRole("button", { name: "Clôturer la restriction" })).toBeVisible();

  // Nettoyage immédiat : cette restriction ne sert qu'à la démonstration de ce test, jamais
  // laissée active pour ne pas fausser un run E2E suivant sur ce même joueur.
  await page.getByRole("button", { name: "Clôturer la restriction" }).click();
});

test("4a. Joueur 1 répond présent et propose de conduire", async ({ page }) => {
  await loginAs(page, "player1");
  await page.goto(`/matches/${matchId}`);
  await page.getByRole("button", { name: /^Présent$/ }).first().click();
  await page.locator('input[name="carpool_role"][value="driver"]').check({ force: true });
  await page.locator('input[name="available_seats"]').fill("2");
  await page.locator("form", { has: page.locator('input[name="carpool_role"]') }).getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText(/Enregistré/)).toBeVisible();
});

test("4b. Joueur 2 répond présent et cherche une place", async ({ page }) => {
  await loginAs(page, "player2");
  await page.goto(`/matches/${matchId}`);
  await page.getByRole("button", { name: /^Présent$/ }).first().click();
  await page.locator('input[name="carpool_role"][value="rider"]').check({ force: true });
  await page.locator("form", { has: page.locator('input[name="carpool_role"]') }).getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText(/Enregistré/)).toBeVisible();
});

test("4c. Coach affecte le passager au conducteur", async ({ page }) => {
  await loginAs(page, "coach");
  await page.goto(`/matches/${matchId}`);
  const assignForm = page.locator("form", { has: page.locator('select[name="passenger_id"]') });
  await expect(assignForm).toBeVisible();
  await assignForm.locator("select").selectOption({ index: 1 });
  await assignForm.getByRole("button", { name: "Affecter" }).click();
  await expect(page.getByText("Retirer")).toBeVisible();
});

test("5. Coach ajoute du matériel, l'assigne, le confirme, le marque apporté", async ({ page }) => {
  await loginAs(page, "coach");
  await page.goto(`/matches/${matchId}`);
  await page.getByLabel("Nouvel élément").fill("Ballons E2E");
  await page.getByRole("button", { name: "+ Ajouter" }).click();

  const equipmentSection = page.locator("section", { hasText: "Qui apporte quoi" });
  const itemRow = equipmentSection.locator("li", { hasText: "Ballons E2E" });
  await expect(itemRow).toBeVisible();
  await itemRow.getByRole("button", { name: "Je m'en occupe" }).click();
  await expect(itemRow.getByText(/Assigné/)).toBeVisible();
  await itemRow.getByRole("button", { name: "Confirmer" }).click();
  await expect(itemRow.getByText(/Confirmé/)).toBeVisible();
  await itemRow.getByRole("button", { name: "Marquer apporté" }).click();
  await expect(itemRow.getByText(/Apporté/)).toBeVisible();
});

test("6. Joueur voit et coche un item de sa checklist privée", async ({ page }) => {
  await loginAs(page, "player1");
  await page.goto(`/matches/${matchId}`);
  const checklist = page.locator("section", { hasText: "Ma checklist" });
  await expect(checklist).toBeVisible();
  const firstCheckbox = checklist.locator('input[type="checkbox"]').first();
  await firstCheckbox.check();
  await page.waitForTimeout(300);
  await page.reload();
  await expect(checklist.locator('input[type="checkbox"]').first()).toBeChecked();
});

test("7. Aucune erreur serveur sur les pages clés du lot", async ({ page }) => {
  await loginAs(page, "coach");
  for (const url of ["/admin/terrains", "/admin/modeles", "/admin/checklist", "/admin/sante", `/matches/${matchId}`]) {
    const response = await page.goto(url);
    expect(response?.status(), `${url} ne doit jamais répondre 5xx`).toBeLessThan(500);
  }
});

test("8. Nettoyage — suppression du match généré par ce scénario", async ({ page }) => {
  await loginAs(page, "coach");
  await page.goto(`/matches/${matchId}/edit`);
  await page.getByRole("button", { name: "Supprimer ce match" }).click();
  await page.waitForURL("/matches");

  const response = await page.goto(`/matches/${matchId}`);
  expect(response?.status()).toBeLessThan(500);
});
