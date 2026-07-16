import type { AvailabilityStatus } from "@/types/models";

export const AVAILABILITY_LABELS: Record<AvailabilityStatus, string> = {
  present: "Présent",
  unsure: "Incertain",
  absent: "Absent",
  injured: "Blessé",
};

export const MATCH_TYPE_LABELS: Record<string, string> = {
  championnat: "Championnat",
  amical: "Amical",
  coupe: "Coupe",
};
