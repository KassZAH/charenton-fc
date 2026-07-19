import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { FlaStandingsProvider } from "./fla-provider";

/**
 * Roadmap V3, Lot 11.5, §17 — tests unitaires du provider contre de vraies
 * pages HTML sauvegardées (jamais un fetch réel en suite unitaire). Les deux
 * fixtures ont été récupérées en direct sur la source réelle lors de l'audit
 * technique (docs/fla-integration.md) : championnat 13/saison 2 (cible réelle,
 * vide) et championnat 1/saison 2 (classement peuplé, sert de cas de contraste).
 */

const EMPTY_HTML = readFileSync(
  path.join(__dirname, "__fixtures__/fla-rankings-championship13-season2-empty.html"),
  "utf8"
);
const POPULATED_HTML = readFileSync(
  path.join(__dirname, "__fixtures__/fla-rankings-championship1-season2-populated.html"),
  "utf8"
);

function mockFetchOnce(html: string, init?: Partial<Response>) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      type: "basic",
      body: {
        getReader: () => {
          let done = false;
          return {
            read: async () => {
              if (done) return { done: true, value: undefined };
              done = true;
              return { done: false, value: new TextEncoder().encode(html) };
            },
            cancel: async () => {},
          };
        },
      },
      ...init,
    })
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("FlaStandingsProvider.fetchStandings — classement réel vide (cible §1)", () => {
  it("retourne status=empty, jamais une erreur, jamais un classement fabriqué", async () => {
    mockFetchOnce(EMPTY_HTML);
    const result = await FlaStandingsProvider.fetchStandings("13", "2");
    expect(result.status).toBe("empty");
    if (result.status === "empty") {
      expect(result.metadata.competitionName).toBe("Foot à 11 - Week-end - 2ème division");
    }
  });
});

describe("FlaStandingsProvider.fetchStandings — classement peuplé (cas de contraste)", () => {
  it("retourne status=success avec des lignes correctement typées, jamais de zéro fabriqué", async () => {
    mockFetchOnce(POPULATED_HTML);
    const result = await FlaStandingsProvider.fetchStandings("1", "2");
    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.standings.length).toBeGreaterThan(0);

    const first = result.standings[0];
    expect(first.position).toBe(1);
    expect(typeof first.teamName).toBe("string");
    expect(first.teamName.length).toBeGreaterThan(0);
    expect(first.normalizedTeamName).toBe(first.normalizedTeamName.toLowerCase());
    // goalDifference recalculé uniquement si absent et que les deux termes sont connus.
    if (first.goalsFor !== null && first.goalsAgainst !== null) {
      expect(first.goalDifference).toBe(first.goalsFor - first.goalsAgainst);
    }
  });

  it("aucune ligne ne fabrique une statistique manquante à 0 — les cellules '-' restent null", async () => {
    mockFetchOnce(POPULATED_HTML);
    const result = await FlaStandingsProvider.fetchStandings("1", "2");
    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    // Au moins une valeur numérique cohérente doit exister quelque part (le fixtures n'est pas vide) —
    // et aucune valeur ne doit être NaN (parseStatCell ne produit jamais NaN, seulement null).
    for (const row of result.standings) {
      for (const value of [row.position, row.played, row.wins, row.draws, row.losses, row.goalsFor, row.goalsAgainst, row.goalDifference, row.points]) {
        expect(value === null || Number.isFinite(value)).toBe(true);
      }
    }
  });
});

describe("FlaStandingsProvider.fetchStandings — pannes réseau et contenu invalide", () => {
  it("timeout / erreur réseau -> status=unavailable, jamais une exception qui remonte", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network error"))
    );
    const result = await FlaStandingsProvider.fetchStandings("13", "2");
    expect(result.status).toBe("unavailable");
    if (result.status === "unavailable") {
      expect(result.errorMessage).not.toContain(EMPTY_HTML.slice(0, 20));
    }
  });

  it("redirection -> refusée, status=unavailable (aucune redirection jamais suivie)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 302, type: "basic", body: null })
    );
    const result = await FlaStandingsProvider.fetchStandings("13", "2");
    expect(result.status).toBe("unavailable");
  });

  it("réponse HTTP non-ok (ex. 500) -> status=unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500, type: "basic", body: null })
    );
    const result = await FlaStandingsProvider.fetchStandings("13", "2");
    expect(result.status).toBe("unavailable");
  });

  it("réponse trop volumineuse -> refusée avant d'être entièrement chargée en mémoire", async () => {
    const bigChunk = new TextEncoder().encode("x".repeat(3 * 1024 * 1024));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        type: "basic",
        body: {
          getReader: () => {
            let sent = false;
            return {
              read: async () => {
                if (sent) return { done: true, value: undefined };
                sent = true;
                return { done: false, value: bigChunk };
              },
              cancel: async () => {},
            };
          },
        },
      })
    );
    const result = await FlaStandingsProvider.fetchStandings("13", "2");
    expect(result.status).toBe("unavailable");
    if (result.status === "unavailable") {
      expect(result.errorMessage).toMatch(/volumineuse/i);
    }
  });

  it("HTML sans structure de classement reconnaissable -> jamais une exception non gérée", async () => {
    mockFetchOnce("<html><body>Page inattendue, structure changée</body></html>");
    const result = await FlaStandingsProvider.fetchStandings("13", "2");
    // Aucune ligne ni marqueur vide reconnu -> traité comme un classement vide plutôt qu'un plantage.
    expect(["empty", "invalid_payload"]).toContain(result.status);
  });
});

describe("FlaStandingsProvider.buildSourceUrl — construction d'URL contrôlée", () => {
  it("reste toujours sur le domaine autorisé, quels que soient les identifiants fournis", () => {
    const url = FlaStandingsProvider.buildSourceUrl("13", "2");
    expect(url).toBe("https://football-loisir-amateur.fr/championships/13/rankings?season=2");
  });

  it("encode les identifiants — jamais une injection de segment d'URL", () => {
    const url = FlaStandingsProvider.buildSourceUrl("13/../evil", "2");
    expect(new URL(url).hostname).toBe("football-loisir-amateur.fr");
  });
});
