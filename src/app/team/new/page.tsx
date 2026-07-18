import { requireAdmin } from "@/lib/auth/current-user";
import { createPlayer } from "@/lib/data/players-actions";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

/**
 * Toujours créé avec role="player" — la promotion en coach est une action
 * séparée, réservée au propriétaire (roadmap V3, Lot 5).
 */
export default async function NewPlayerPage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-md lg:max-w-2xl px-4 py-6">
      <h1 className="mb-4 text-lg font-extrabold text-cream">Ajouter un joueur</h1>

      <form action={createPlayer} className="space-y-4">
        <Field label="Prénom" name="first_name" required />
        <Field label="Nom" name="last_name" />
        <Field label="Surnom" name="nickname" />

        <div className="grid grid-cols-2 gap-3">
          <Field label="Numéro de maillot" name="shirt_number" type="number" />
          <Field label="Poste" name="primary_position" />
        </div>

        <Field label="PIN (6 chiffres)" name="pin" inputMode="numeric" required />

        <Button type="submit" variant="primary" shape="block">
          Ajouter
        </Button>
      </form>
    </div>
  );
}
