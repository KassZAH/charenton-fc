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
