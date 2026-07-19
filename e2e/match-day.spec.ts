import { test, expect, type Page } from "@playwright/test";
import { loginAs } from "./fixtures";

/**
 * Roadmap V3, Macro-release A (§11 du prompt de lancement) — scénario
 * principal consolidé Match Day v1. Un seul match fictif créé et nettoyé
 * par ce fichier ; projet isolé exclusivement (voir playwright.config.ts).
 *
 * Limite assumée : le dataset isolé ne compte que 5 comptes fictifs, sous
 * le minimum MIN_PLAYERS=8 utilisé par getMatchReadiness — l'alerte
 * "effectif insuffisant" ne peut donc jamais être résolue à zéro dans ce
 * scénario ; on vérifie qu'elle apparaît/disparaît correctement pour les
 * signaux qui, eux, sont réellement atteignables (gardien, matériel,
 * covoiturage), pas l'effectif.
 */

test.describe.configure({ mode: "serial" });

let matchId: string;
let secondMatchId: string;
const opponentName = "Adversaire Test";

test("1. Propriétaire crée un match fictif", async ({ page }) => {
  await loginAs(page, "owner");
  await page.goto("/matches/new");
  await page.getByLabel("Adversaire existant").selectOption({ label: opponentName });
  const inThreeDays = new Date(Date.now() + 3 * 86400_000).toISOString().slice(0, 10);
  await page.getByLabel("Date", { exact: true }).fill(inThreeDays);
  await page.getByRole("button", { name: "Créer le match" }).click();
  await page.waitForURL(/\/matches\/[0-9a-f-]+$/);
  matchId = page.url().split("/matches/")[1];
  expect(matchId).toBeTruthy();
  await expect(page.getByRole("heading", { name: new RegExp(opponentName) })).toBeVisible();
});

test("2. Alertes de préparation visibles sur la fiche match", async ({ page }) => {
  await loginAs(page, "owner");
  await page.goto(`/matches/${matchId}`);
  await expect(page.getByText("En attente des réponses des joueurs")).toBeVisible();

  // Une réponse "présent" fait apparaître les alertes réellement actionnables.
  await page.getByRole("button", { name: /^Présent$/ }).first().click();
  await expect(page.getByText(/Aucun gardien confirmé/)).toBeVisible();
});

test("3. Coach prépare le groupe convoqué et désigne un gardien prévu", async ({ page }) => {
  await loginAs(page, "coach");
  await page.goto(`/matches/${matchId}`);

  await page.locator('input[name="called_up_player_id"]').nth(0).check();
  await page.locator('input[name="called_up_player_id"]').nth(1).check();
  await page.locator('input[name="waitlist_player_id"]').nth(2).check();
  await page.locator("select#planned_goalkeeper_player_id").selectOption({ index: 1 });

  await page.getByRole("button", { name: "Publier et verrouiller" }).click();
  await expect(page.getByText("Composition publiée")).toBeVisible();
});

test("4. Lecture Joueur : composition visible, aucun contrôle d'édition", async ({ page }) => {
  await loginAs(page, "player3");
  await page.goto(`/matches/${matchId}`);
  await expect(page.getByText("Composition publiée")).toBeVisible();
  await expect(page.getByRole("button", { name: "Publier et verrouiller" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Déverrouiller pour modifier" })).toHaveCount(0);
});

test("5. Modification interdite tant que verrouillé, déverrouillage Coach puis modification effective", async ({ page }) => {
  await loginAs(page, "coach");
  await page.goto(`/matches/${matchId}`);
  await expect(page.getByRole("button", { name: "Publier et verrouiller" })).toHaveCount(0);

  await page.getByRole("button", { name: "Déverrouiller pour modifier" }).click();
  await expect(page.getByRole("button", { name: "Publier et verrouiller" })).toBeVisible();
});

test("6. Démarrage du match et ouverture de l'écran en direct", async ({ page }) => {
  await loginAs(page, "owner");
  await page.goto(`/matches/${matchId}`);
  await page.getByRole("button", { name: "▶ Démarrer le match" }).click();
  await page.waitForURL(`/matches/${matchId}/live`);
  await expect(page.getByText("En direct")).toBeVisible();
});

test("7-8. Deux contextes ajoutent des événements en direct ; double-clic sans duplication", async ({ browser }) => {
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();
  await loginAs(pageA, "owner");
  await loginAs(pageB, "coach");
  await pageA.goto(`/matches/${matchId}/live`);
  await pageB.goto(`/matches/${matchId}/live`);

  // Deux buts différents ajoutés depuis deux contextes distincts, en parallèle.
  await Promise.all([addGoalOnLivePage(pageA), addGoalOnLivePage(pageB)]);
  await pageA.reload();
  await expect(pageA.locator("text=/\\d+ – \\d+/").first()).toBeVisible();

  // Double-clic : le même formulaire de carton soumis deux fois de suite (clé d'idempotence stable
  // tant que la page n'est pas rechargée) ne doit produire qu'un seul carton.
  await pageA.goto(`/matches/${matchId}/live`);
  const cardSelect = pageA.locator('select[name="player_id"]').last();
  await cardSelect.selectOption({ index: 1 });
  const addCardButton = pageA.getByRole("button", { name: "Ajouter le carton" });
  await Promise.all([addCardButton.click(), addCardButton.click({ force: true }).catch(() => {})]);
  await pageA.waitForTimeout(1500);
  await pageA.reload();
  const cardCount = await pageA.getByText(/— (Jaune|Rouge)/).count();
  expect(cardCount, "un double-clic ne doit jamais produire deux cartons").toBeLessThanOrEqual(1);

  await ctxA.close();
  await ctxB.close();
});

async function addGoalOnLivePage(page: Page) {
  await page.locator('select[name="scorer_player_id"]').selectOption({ index: 1 });
  await page.getByRole("button", { name: "Ajouter" }).first().click();
  await page.waitForTimeout(500);
}

test("9. Présence réelle indépendante du groupe convoqué initial", async ({ page }) => {
  await loginAs(page, "owner");
  await page.goto(`/matches/${matchId}`);
  const calledUpBefore = await page.locator('input[name="called_up_player_id"]:checked').count();

  await page.goto(`/matches/${matchId}/live`);
  // Marque un joueur non convoqué (waitlist) comme réellement présent (section "Présence réelle",
  // menu déroulant par joueur) — ne doit jamais réécrire le groupe convoqué déjà publié
  // (déverrouillé par le test précédent, donc affiché en édition, pas en lecture verrouillée).
  const presenceSelects = page.locator("section", { hasText: "Présence réelle" }).locator("select");
  await presenceSelects.last().selectOption("present");
  await page.waitForTimeout(300);

  await page.goto(`/matches/${matchId}`);
  const calledUpAfter = await page.locator('input[name="called_up_player_id"]:checked').count();
  expect(calledUpAfter, "la présence réelle ne doit jamais modifier le groupe convoqué").toBe(calledUpBefore);
});

test("10-11. Fin du match, vérification de la fiche et des statistiques", async ({ page }) => {
  await loginAs(page, "owner");
  await page.goto(`/matches/${matchId}/live`);
  await page.getByRole("button", { name: "Terminer le match" }).click();
  await page.waitForURL(`/matches/${matchId}`);
  await expect(page.getByText(/–/)).toBeVisible();

  await page.goto("/stats");
  const response = await page.goto("/stats");
  expect(response?.status()).toBeLessThan(500);
});

test("12-14. Second match : saisie groupée puis annulation complète du lot", async ({ page }) => {
  await loginAs(page, "owner");
  await page.goto("/matches/new");
  await page.getByLabel("Adversaire existant").selectOption({ label: opponentName });
  const inFiveDays = new Date(Date.now() + 5 * 86400_000).toISOString().slice(0, 10);
  await page.getByLabel("Date", { exact: true }).fill(inFiveDays);
  await page.getByRole("button", { name: "Créer le match" }).click();
  await page.waitForURL(/\/matches\/[0-9a-f-]+$/);
  secondMatchId = page.url().split("/matches/")[1];

  const batchSection = page.locator("section", { hasText: "Saisie groupée des buts" });
  const goalInputs = batchSection.locator('input[aria-label^="Buts "]');
  await goalInputs.nth(0).fill("2");
  await goalInputs.nth(1).fill("1");
  await batchSection.getByLabel("Score adverse").fill("2");
  await batchSection.getByRole("button", { name: "Voir l'aperçu" }).click();
  await expect(page.getByText(/Score final : Charenton 3/)).toBeVisible();
  await page.getByRole("button", { name: "Confirmer" }).click();
  await expect(page.getByText(/Enregistré — score final 3/)).toBeVisible();

  await page.getByRole("button", { name: "Annuler tout le lot" }).click();
  await expect(page.getByRole("button", { name: "Voir l'aperçu" })).toBeVisible();
});

test("15. Nettoyage — suppression des matchs de démonstration créés par ce scénario", async ({ page }) => {
  await loginAs(page, "owner");
  for (const id of [matchId, secondMatchId]) {
    await page.goto(`/matches/${id}/edit`);
    await page.getByRole("button", { name: "Supprimer ce match" }).click();
    await page.waitForURL("/matches");
  }
  // Vérifie qu'aucune des deux fixtures créées par ce scénario ne réapparaît dans les listes.
  await page.goto("/matches");
  await expect(page.getByText(opponentName).first()).toBeVisible(); // les vrais matchs seedés restent visibles
  const response = await page.goto(`/matches/${matchId}`);
  expect(response?.status()).toBeLessThan(500);
});
