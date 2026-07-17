"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/current-user";
import { createBackup } from "./backups";

export async function createManualBackup(formData: FormData) {
  const user = await requireAdmin();

  const label = String(formData.get("label") ?? "").trim() || "Sauvegarde manuelle";

  await createBackup("manual", label, user.playerId);

  revalidatePath("/admin/sauvegardes");
}
