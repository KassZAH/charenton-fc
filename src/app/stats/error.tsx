"use client";

import { useEffect } from "react";
import { ResponsivePageContainer } from "@/components/ui/ResponsivePageContainer";
import { ErrorState } from "@/components/ui/ErrorState";

export default function StatsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Pas de service de suivi d'erreurs dans ce projet — au moins visible dans les logs serveur Vercel.
    console.error(error);
  }, [error]);

  return (
    <ResponsivePageContainer>
      <ErrorState
        title="Impossible d'afficher les statistiques"
        text="Vérifie ta connexion et réessaie."
        onRetry={reset}
      />
    </ResponsivePageContainer>
  );
}
