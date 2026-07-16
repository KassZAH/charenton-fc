export type FormationKey = "4-4-2" | "4-3-3" | "3-5-2" | "4-2-3-1";

export type FormationSlot = {
  /** Identifiant stable (clé dans positions jsonb), pas forcément unique visuellement (ex: CB1/CB2). */
  key: string;
  label: string;
  /** Coordonnées en % sur le terrain — x: gauche→droite, y: 0 = but adverse (haut), 100 = notre but (bas). */
  x: number;
  y: number;
};

export const FORMATION_LABELS: Record<FormationKey, string> = {
  "4-4-2": "4-4-2",
  "4-3-3": "4-3-3",
  "3-5-2": "3-5-2",
  "4-2-3-1": "4-2-3-1",
};

export const FORMATIONS: Record<FormationKey, FormationSlot[]> = {
  "4-4-2": [
    { key: "GK", label: "Gardien", x: 50, y: 92 },
    { key: "LB", label: "Latéral G", x: 15, y: 72 },
    { key: "CB1", label: "Défenseur central", x: 38, y: 76 },
    { key: "CB2", label: "Défenseur central", x: 62, y: 76 },
    { key: "RB", label: "Latéral D", x: 85, y: 72 },
    { key: "LM", label: "Milieu G", x: 15, y: 46 },
    { key: "CM1", label: "Milieu central", x: 38, y: 48 },
    { key: "CM2", label: "Milieu central", x: 62, y: 48 },
    { key: "RM", label: "Milieu D", x: 85, y: 46 },
    { key: "ST1", label: "Attaquant", x: 38, y: 18 },
    { key: "ST2", label: "Attaquant", x: 62, y: 18 },
  ],
  "4-3-3": [
    { key: "GK", label: "Gardien", x: 50, y: 92 },
    { key: "LB", label: "Latéral G", x: 15, y: 72 },
    { key: "CB1", label: "Défenseur central", x: 38, y: 76 },
    { key: "CB2", label: "Défenseur central", x: 62, y: 76 },
    { key: "RB", label: "Latéral D", x: 85, y: 72 },
    { key: "CM1", label: "Milieu", x: 30, y: 50 },
    { key: "CM2", label: "Milieu", x: 50, y: 54 },
    { key: "CM3", label: "Milieu", x: 70, y: 50 },
    { key: "LW", label: "Ailier G", x: 18, y: 20 },
    { key: "ST", label: "Attaquant", x: 50, y: 14 },
    { key: "RW", label: "Ailier D", x: 82, y: 20 },
  ],
  "3-5-2": [
    { key: "GK", label: "Gardien", x: 50, y: 92 },
    { key: "CB1", label: "Défenseur central", x: 30, y: 76 },
    { key: "CB2", label: "Défenseur central", x: 50, y: 79 },
    { key: "CB3", label: "Défenseur central", x: 70, y: 76 },
    { key: "LM", label: "Piston G", x: 10, y: 50 },
    { key: "CM1", label: "Milieu", x: 35, y: 48 },
    { key: "CM2", label: "Milieu", x: 50, y: 53 },
    { key: "CM3", label: "Milieu", x: 65, y: 48 },
    { key: "RM", label: "Piston D", x: 90, y: 50 },
    { key: "ST1", label: "Attaquant", x: 38, y: 18 },
    { key: "ST2", label: "Attaquant", x: 62, y: 18 },
  ],
  "4-2-3-1": [
    { key: "GK", label: "Gardien", x: 50, y: 92 },
    { key: "LB", label: "Latéral G", x: 15, y: 72 },
    { key: "CB1", label: "Défenseur central", x: 38, y: 76 },
    { key: "CB2", label: "Défenseur central", x: 62, y: 76 },
    { key: "RB", label: "Latéral D", x: 85, y: 72 },
    { key: "CDM1", label: "Milieu défensif", x: 38, y: 58 },
    { key: "CDM2", label: "Milieu défensif", x: 62, y: 58 },
    { key: "LAM", label: "Milieu offensif G", x: 20, y: 34 },
    { key: "CAM", label: "Milieu offensif", x: 50, y: 30 },
    { key: "RAM", label: "Milieu offensif D", x: 80, y: 34 },
    { key: "ST", label: "Attaquant", x: 50, y: 14 },
  ],
};
