import Link from "next/link";
import { requireFreshCoach } from "@/lib/auth/current-user";
import { getChecklistTemplates } from "@/lib/data/checklist";
import { addChecklistTemplate, deleteChecklistTemplate } from "@/lib/data/checklist-actions";
import { ResponsivePageContainer } from "@/components/ui/ResponsivePageContainer";

export default async function ChecklistTemplatesPage() {
  await requireFreshCoach();
  const templates = await getChecklistTemplates();

  return (
    <ResponsivePageContainer size="full">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-scoreboard text-xl font-extrabold text-cream">Checklist d&apos;équipe</h1>
        <Link href="/admin" className="text-xs font-medium text-steel underline underline-offset-2">
          ← Gestion
        </Link>
      </div>
      <p className="mb-4 text-xs text-steel/70">
        Ces rappels apparaissent automatiquement dans la checklist privée de chaque joueur pour chaque match à venir
        — la checklist reste toujours privée à chacun, jamais un suivi partagé.
      </p>

      <form action={addChecklistTemplate} className="mb-4 flex gap-2">
        <input
          type="text"
          name="label"
          required
          placeholder="ex. Arriver 15 minutes avant"
          className="flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream placeholder:text-steel/50 focus:border-gold/50 focus:outline-none"
        />
        <button type="submit" className="rounded-lg bg-gold px-4 py-2 text-sm font-bold text-navy-deep">
          Ajouter
        </button>
      </form>

      {templates.length === 0 ? (
        <p className="text-sm text-steel/70">Aucun rappel d&apos;équipe pour le moment.</p>
      ) : (
        <ul className="space-y-1.5">
          {templates.map((t) => (
            <li key={t.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-navy-card px-3 py-2">
              <span className="text-sm text-cream">{t.label}</span>
              <form action={deleteChecklistTemplate.bind(null, t.id)}>
                <button type="submit" className="text-xs font-medium text-steel/60">
                  Suppr.
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </ResponsivePageContainer>
  );
}
