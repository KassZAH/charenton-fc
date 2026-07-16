import { requireAdmin } from "@/lib/auth/current-user";
import { createPlayer } from "@/lib/data/players-actions";

export default async function NewPlayerPage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <h1 className="mb-4 text-lg font-bold text-navy">Ajouter un joueur</h1>

      <form action={createPlayer} className="space-y-4">
        <Field label="Prénom" name="first_name" required />
        <Field label="Nom" name="last_name" />
        <Field label="Surnom" name="nickname" />

        <div className="grid grid-cols-2 gap-3">
          <Field label="Numéro de maillot" name="shirt_number" type="number" />
          <Field label="Poste" name="primary_position" />
        </div>

        <div>
          <label className="block text-sm font-medium text-navy" htmlFor="role">
            Rôle
          </label>
          <select
            id="role"
            name="role"
            defaultValue="player"
            className="mt-1 w-full rounded-lg border border-navy/20 px-3 py-2"
          >
            <option value="player">Joueur (PIN à 4 chiffres)</option>
            <option value="admin">Admin (PIN à 6 chiffres)</option>
            <option value="coach">Coach (PIN à 6 chiffres)</option>
          </select>
        </div>

        <Field label="PIN" name="pin" inputMode="numeric" required />

        <button type="submit" className="w-full rounded-lg bg-navy py-3 text-sm font-semibold text-gold">
          Ajouter
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
  inputMode,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  inputMode?: "numeric";
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
        inputMode={inputMode}
        className="mt-1 w-full rounded-lg border border-navy/20 px-3 py-2"
      />
    </div>
  );
}
