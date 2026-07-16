import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/current-user";
import { getPlayerById } from "@/lib/data/players";
import { updatePlayer, setPlayerStatus } from "@/lib/data/players-actions";

export default async function EditPlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin();

  const player = await getPlayerById(id);
  if (!player) notFound();

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <h1 className="mb-4 text-lg font-bold text-navy">Modifier {player.first_name}</h1>

      <form action={updatePlayer.bind(null, player.id)} className="space-y-4">
        <Field label="Prénom" name="first_name" defaultValue={player.first_name} required />
        <Field label="Nom" name="last_name" defaultValue={player.last_name ?? ""} />
        <Field label="Surnom" name="nickname" defaultValue={player.nickname ?? ""} />

        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Numéro de maillot"
            name="shirt_number"
            type="number"
            defaultValue={player.shirt_number?.toString() ?? ""}
          />
          <Field label="Poste" name="primary_position" defaultValue={player.primary_position ?? ""} />
        </div>

        <div>
          <label className="block text-sm font-medium text-navy" htmlFor="strong_foot">
            Pied fort
          </label>
          <select
            id="strong_foot"
            name="strong_foot"
            defaultValue={player.strong_foot ?? ""}
            className="mt-1 w-full rounded-lg border border-navy/20 px-3 py-2"
          >
            <option value="">—</option>
            <option value="left">Gauche</option>
            <option value="right">Droit</option>
            <option value="both">Ambidextre</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-navy" htmlFor="quote">
            Citation
          </label>
          <input
            id="quote"
            type="text"
            name="quote"
            defaultValue={player.quote ?? ""}
            className="mt-1 w-full rounded-lg border border-navy/20 px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-navy" htmlFor="role">
            Rôle
          </label>
          <select
            id="role"
            name="role"
            defaultValue={player.role}
            className="mt-1 w-full rounded-lg border border-navy/20 px-3 py-2"
          >
            <option value="player">Joueur (PIN à 4 chiffres)</option>
            <option value="admin">Admin (PIN à 6 chiffres)</option>
          </select>
          <p className="mt-1 text-xs text-navy/50">
            Un changement de rôle ne prend effet qu&apos;à la prochaine connexion de ce joueur.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-navy" htmlFor="new_pin">
            Nouveau PIN
          </label>
          <input
            id="new_pin"
            type="text"
            name="new_pin"
            inputMode="numeric"
            placeholder="Laisser vide pour ne pas changer"
            className="mt-1 w-full rounded-lg border border-navy/20 px-3 py-2"
          />
        </div>

        <button type="submit" className="w-full rounded-lg bg-navy py-3 text-sm font-semibold text-gold">
          Enregistrer
        </button>
      </form>

      <form
        action={setPlayerStatus.bind(null, player.id, player.status === "archived" ? "active" : "archived")}
        className="mt-4"
      >
        <button
          type="submit"
          className="w-full rounded-lg border border-navy/20 py-3 text-sm font-semibold text-navy/70"
        >
          {player.status === "archived" ? "Réactiver ce joueur" : "Archiver ce joueur"}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-navy" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        type={type}
        name={name}
        required={required}
        defaultValue={defaultValue}
        className="mt-1 w-full rounded-lg border border-navy/20 px-3 py-2"
      />
    </div>
  );
}
