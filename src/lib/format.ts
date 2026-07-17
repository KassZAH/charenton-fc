export function formatMatchDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatTime(timeStr: string | null) {
  if (!timeStr) return null;
  return timeStr.slice(0, 5);
}

/** Pour un timestamp complet (ex: player_measurements.recorded_at) — pas de décalage à gérer, c'est déjà un instant précis. */
export function formatShortDate(isoString: string) {
  return new Date(isoString).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

/** Pour une colonne `date` seule (ex: injuries.estimated_return_date) — même précaution que formatMatchDate contre le décalage UTC. */
export function formatShortDateOnly(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}
