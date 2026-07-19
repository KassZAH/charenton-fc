import { describe, it, expect } from "vitest";
import { buildContextualLabels } from "./checklist";

describe("buildContextualLabels", () => {
  it("aucun signal : liste vide", () => {
    expect(buildContextualLabels({ isCaptain: false, assignedEquipmentLabels: [], hasUnpaidDues: false })).toEqual([]);
  });

  it("capitaine → 'Être capitaine'", () => {
    expect(buildContextualLabels({ isCaptain: true, assignedEquipmentLabels: [], hasUnpaidDues: false })).toContain(
      "Être capitaine"
    );
  });

  it("matériel assigné → un item par élément", () => {
    const labels = buildContextualLabels({ isCaptain: false, assignedEquipmentLabels: ["Ballons", "Chasubles"], hasUnpaidDues: false });
    expect(labels).toEqual(["Apporter : Ballons", "Apporter : Chasubles"]);
  });

  it("cotisation impayée → 'Cotisation restante'", () => {
    expect(buildContextualLabels({ isCaptain: false, assignedEquipmentLabels: [], hasUnpaidDues: true })).toContain(
      "Cotisation restante"
    );
  });

  it("cumule tous les signaux actifs", () => {
    const labels = buildContextualLabels({ isCaptain: true, assignedEquipmentLabels: ["Ballons"], hasUnpaidDues: true });
    expect(labels).toEqual(["Être capitaine", "Apporter : Ballons", "Cotisation restante"]);
  });
});
