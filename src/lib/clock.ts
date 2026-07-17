const TIMEZONE = "Europe/Paris";

/** Date du jour au format YYYY-MM-DD, dans le fuseau de l'équipe plutôt que celui du serveur. */
export function todayDateString(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: TIMEZONE });
}

/** Heure actuelle au format HH:MM:SS, comparable lexicalement à match.kickoff_time. */
export function currentTimeString(): string {
  return new Date().toLocaleTimeString("en-GB", { timeZone: TIMEZONE, hour12: false });
}
