import { requireAdmin } from "@/lib/auth/current-user";
import { createPlayer } from "@/lib/data/players-actions";
import { Field, SelectField } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export default async function NewPlayerPage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <h1 className="mb-4 text-lg font-extrabold text-cream">Ajouter un joueur</h1>

      <form action={createPlayer} className="space-y-4">
        <Field label="Prénom" name="first_name" required />
        <Field label="Nom" name="last_name" />
        <Field label="Surnom" name="nickname" />

        <div className="grid grid-cols-2 gap-3">
          <Field label="Numéro de maillot" name="shirt_number" type="number" />
          <Field label="Poste" name="primary_position" />
        </div>

        <SelectField label="Rôle" name="role" defaultValue="player">
          <option value="player">Joueur (PIN à 4 chiffres)</option>
          <option value="admin">Admin (PIN à 6 chiffres)</option>
          <option value="coach">Coach (PIN à 6 chiffres)</option>
        </SelectField>

        <Field label="PIN" name="pin" inputMode="numeric" required />

        <Button type="submit" variant="primary" shape="block">
          Ajouter
        </Button>
      </form>
    </div>
  );
}
