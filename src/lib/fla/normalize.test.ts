import { describe, it, expect } from "vitest";
import { normalizeTeamName } from "./normalize";

describe("normalizeTeamName — roadmap V3, Lot 11.5, §14", () => {
  it("met en minuscules, neutralise les accents et la ponctuation, réduit les espaces", () => {
    expect(normalizeTeamName("Étoile-Sportive  de  Charenton !")).toBe("etoile sportive de charenton");
  });

  it("deux écritures équivalentes du même nom normalisent à l'identique", () => {
    expect(normalizeTeamName("AS Fictif   Paris")).toBe(normalizeTeamName("as fictif paris"));
  });

  it("ne résout jamais un synonyme ou une abréviation (comparaison volontairement conservatrice)", () => {
    expect(normalizeTeamName("FC Charenton")).not.toBe(normalizeTeamName("Charenton FC"));
    expect(normalizeTeamName("US Ivry")).not.toBe(normalizeTeamName("Union Sportive Ivry"));
  });

  it("chaîne vide -> chaîne vide, pas d'exception", () => {
    expect(normalizeTeamName("")).toBe("");
  });
});
