import { requireAdmin } from "@/lib/auth/current-user";
import { getOpponents } from "@/lib/data/opponents";
import { BulkMatchForm } from "./BulkMatchForm";

export default async function NewMatchBulkPage() {
  await requireAdmin();
  const opponents = await getOpponents();

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <h1 className="mb-1 text-lg font-extrabold text-cream">Ajouter plusieurs matchs</h1>
      <p className="mb-4 text-sm text-steel/70">
        Adversaire et date suffisent pour l&apos;instant — heure et lieu se complètent plus tard, match
        par match.
      </p>
      <BulkMatchForm opponents={opponents} />
    </div>
  );
}
