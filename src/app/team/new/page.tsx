import { requireAdmin } from "@/lib/auth/current-user";
import { NewPlayerForm } from "./NewPlayerForm";

/**
 * Toujours créé avec role="player" — la promotion en coach est une action
 * séparée, réservée au propriétaire (roadmap V3, Lot 5).
 */
export default async function NewPlayerPage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-md lg:max-w-2xl px-4 py-6">
      <h1 className="mb-4 text-lg font-extrabold text-cream">Ajouter un joueur</h1>
      <NewPlayerForm />
    </div>
  );
}
