import Link from "next/link";
import { requireFreshCoach } from "@/lib/auth/current-user";
import { getVenues } from "@/lib/data/venues";
import { createVenue, deleteVenue, mergeVenues } from "@/lib/data/venues-actions";
import { ResponsivePageContainer } from "@/components/ui/ResponsivePageContainer";

export default async function VenuesPage() {
  await requireFreshCoach();
  const venues = await getVenues();

  return (
    <ResponsivePageContainer size="full">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-scoreboard text-xl font-extrabold text-cream">Terrains</h1>
        <Link href="/admin" className="text-xs font-medium text-steel underline underline-offset-2">
          ← Gestion
        </Link>
      </div>

      <section className="mb-6">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-steel">Terrains enregistrés</h2>
        {venues.length === 0 ? (
          <p className="text-sm text-steel/70">Aucun terrain enregistré pour le moment.</p>
        ) : (
          <ul className="space-y-2">
            {venues.map((v) => (
              <li key={v.id} className="rounded-xl border border-white/10 bg-navy-card p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-cream">{v.name}</p>
                    {v.address && <p className="text-xs text-steel/70">{v.address}</p>}
                    <p className="mt-1 text-xs text-steel/60">
                      {[v.surface_type, v.lighting ? "éclairé" : null].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <form action={deleteVenue.bind(null, v.id)}>
                    <button type="submit" className="shrink-0 text-xs font-medium text-steel/60 underline underline-offset-2">
                      Suppr.
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {venues.length >= 2 && (
        <section className="mb-6 rounded-xl border border-white/10 bg-navy-card p-3">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-steel">Fusionner deux doublons</h2>
          <form action={mergeVenuesAction} className="flex flex-wrap items-end gap-2">
            <label className="text-xs text-cream">
              Conserver
              <select name="keep_venue_id" className="mt-1 block rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-sm text-cream">
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-cream">
              Fusionner et supprimer
              <select name="merge_venue_id" className="mt-1 block rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-sm text-cream">
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="rounded-lg bg-gold px-3 py-1.5 text-xs font-bold text-navy-deep">
              Fusionner
            </button>
          </form>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-steel">Nouveau terrain</h2>
        <form action={createVenue} className="space-y-3 rounded-xl border border-white/10 bg-navy-card p-3">
          <Field label="Nom" name="name" required />
          <Field label="Adresse" name="address" />
          <Field label="Lien Google Maps" name="maps_url" />
          <Field label="Parking" name="parking_info" />
          <Field label="Vestiaires" name="changing_rooms_info" />
          <Field label="Code d'accès" name="access_code" />
          <Field label="Surface" name="surface_type" placeholder="ex. synthétique, herbe" />
          <label className="flex items-center gap-2 text-sm text-cream">
            <input type="checkbox" name="lighting" /> Éclairé
          </label>
          <Field label="Commentaire pratique" name="notes" />
          <button type="submit" className="w-full rounded-lg bg-gold py-2 text-sm font-bold text-navy-deep">
            Créer
          </button>
        </form>
      </section>
    </ResponsivePageContainer>
  );
}

async function mergeVenuesAction(formData: FormData) {
  "use server";
  const keepVenueId = String(formData.get("keep_venue_id") ?? "");
  const mergeVenueId = String(formData.get("merge_venue_id") ?? "");
  await mergeVenues(keepVenueId, mergeVenueId);
}

function Field({
  label,
  name,
  required,
  placeholder,
}: {
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm text-cream">
      {label}
      <input
        type="text"
        name={name}
        required={required}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-cream placeholder:text-steel/50 focus:border-gold/50 focus:outline-none"
      />
    </label>
  );
}
