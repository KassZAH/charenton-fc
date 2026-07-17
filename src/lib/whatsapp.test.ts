import { describe, it, expect } from "vitest";
import {
  whatsappShareUrl,
  buildConvocationMessage,
  buildReminderMessage,
  buildResultMessage,
  buildSeasonRecapMessage,
} from "./whatsapp";

describe("whatsappShareUrl", () => {
  it("URL-encodes the message text", () => {
    expect(whatsappShareUrl("Salut & bienvenue !")).toBe(
      "https://wa.me/?text=Salut%20%26%20bienvenue%20!"
    );
  });
});

describe("buildConvocationMessage", () => {
  it("lists players by status with counts", () => {
    const text = buildConvocationMessage({
      opponentLabel: "FC Poteaux",
      isHome: true,
      dateLabel: "vendredi 25 juillet",
      timeLabel: "15h00",
      location: "Stade des Marronniers",
      present: ["Amine", "Karim"],
      uncertain: ["Anis"],
      absent: [],
      noResponse: ["Walid"],
    });

    expect(text).toContain("vs FC Poteaux — vendredi 25 juillet à 15h00");
    expect(text).toContain("📍 Stade des Marronniers");
    expect(text).toContain("✅ Présents (2) : Amine, Karim");
    expect(text).toContain("❓ Incertains (1) : Anis");
    expect(text).toContain("❌ Absents (0) : —");
    expect(text).toContain("⏳ Sans réponse (1) : Walid");
  });

  it("omits the location line when there is none", () => {
    const text = buildConvocationMessage({
      opponentLabel: "FC Poteaux",
      isHome: false,
      dateLabel: "vendredi 25 juillet",
      timeLabel: null,
      location: null,
      present: [],
      uncertain: [],
      absent: [],
      noResponse: [],
    });

    expect(text).not.toContain("📍");
    expect(text).toContain("@ FC Poteaux — vendredi 25 juillet");
  });
});

describe("buildReminderMessage", () => {
  it("names everyone who hasn't responded", () => {
    expect(buildReminderMessage({ matchLabel: "vs FC Poteaux (25 juillet)", names: ["Walid", "Sami"] })).toBe(
      "⏰ Walid, Sami : pensez à répondre pour le match vs FC Poteaux (25 juillet) !"
    );
  });
});

describe("buildResultMessage", () => {
  it("includes score, scorers, assists and awards", () => {
    const text = buildResultMessage({
      opponentLabel: "FC Poteaux",
      isHome: true,
      teamScore: 3,
      opponentScore: 1,
      scorers: ["Amine", "Amine"],
      assists: ["Karim"],
      awards: [{ emoji: "🏆", name: "Homme du match", winner: "Amine" }],
    });

    expect(text).toContain("Charenton FC 3 – 1 FC Poteaux");
    expect(text).toContain("Buteurs : Amine, Amine");
    expect(text).toContain("Passeurs : Karim");
    expect(text).toContain("🏆 Homme du match : Amine");
  });

  it("omits scorer/assist/award lines when empty", () => {
    const text = buildResultMessage({
      opponentLabel: "FC Poteaux",
      isHome: false,
      teamScore: 0,
      opponentScore: 0,
      scorers: [],
      assists: [],
      awards: [],
    });

    expect(text).not.toContain("Buteurs");
    expect(text).not.toContain("Passeurs");
  });
});

describe("buildSeasonRecapMessage", () => {
  it("summarizes the season record and skips missing records", () => {
    const text = buildSeasonRecapMessage({
      seasonName: "Saison 2025-2026",
      played: 20,
      wins: 11,
      draws: 4,
      losses: 5,
      goalsFor: 46,
      goalsAgainst: 31,
      topScorer: { name: "Amine", value: 12 },
      topAssist: null,
      mostMatches: null,
      biggestWin: { teamScore: 5, opponentScore: 0, opponentName: "FC Poteaux" },
    });

    expect(text).toContain("20 matchs · 11V 4N 5D");
    expect(text).toContain("👟 Meilleur buteur : Amine (12)");
    expect(text).toContain("🔥 Plus grosse victoire : 5–0 vs FC Poteaux");
    expect(text).not.toContain("Meilleur passeur");
    expect(text).not.toContain("Plus assidu");
  });
});
