export function whatsappShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function buildConvocationMessage(params: {
  opponentLabel: string;
  isHome: boolean;
  dateLabel: string;
  timeLabel: string | null;
  location: string | null;
  present: string[];
  uncertain: string[];
  absent: string[];
  noResponse: string[];
}): string {
  const lines = [
    "📋 Convocation Charenton FC",
    `${params.isHome ? "vs" : "@"} ${params.opponentLabel} — ${params.dateLabel}${
      params.timeLabel ? ` à ${params.timeLabel}` : ""
    }`,
  ];
  if (params.location) lines.push(`📍 ${params.location}`);
  lines.push("");
  lines.push(`✅ Présents (${params.present.length}) : ${params.present.join(", ") || "—"}`);
  lines.push(`❓ Incertains (${params.uncertain.length}) : ${params.uncertain.join(", ") || "—"}`);
  lines.push(`❌ Absents (${params.absent.length}) : ${params.absent.join(", ") || "—"}`);
  lines.push(`⏳ Sans réponse (${params.noResponse.length}) : ${params.noResponse.join(", ") || "—"}`);
  return lines.join("\n");
}

export function buildReminderMessage(params: { matchLabel: string; names: string[] }): string {
  return `⏰ ${params.names.join(", ")} : pensez à répondre pour le match ${params.matchLabel} !`;
}

export function buildResultMessage(params: {
  opponentLabel: string;
  isHome: boolean;
  teamScore: number | null;
  opponentScore: number | null;
  scorers: string[];
  assists: string[];
  awards: { emoji: string | null; name: string; winner: string }[];
}): string {
  const lines = [
    "⚽ Résultat Charenton FC",
    `${params.isHome ? "Charenton FC" : params.opponentLabel} ${params.teamScore} – ${params.opponentScore} ${
      params.isHome ? params.opponentLabel : "Charenton FC"
    }`,
  ];
  if (params.scorers.length > 0) {
    lines.push("");
    lines.push(`Buteurs : ${params.scorers.join(", ")}`);
  }
  if (params.assists.length > 0) {
    lines.push(`Passeurs : ${params.assists.join(", ")}`);
  }
  if (params.awards.length > 0) {
    lines.push("");
    for (const a of params.awards) {
      lines.push(`${a.emoji ?? ""} ${a.name} : ${a.winner}`.trim());
    }
  }
  return lines.join("\n");
}
