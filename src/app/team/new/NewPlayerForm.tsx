"use client";

import { useActionState, useEffect, useRef } from "react";
import { createPlayer, type CreatePlayerState } from "@/lib/data/players-actions";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

const INPUT_CLASSES =
  "mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-cream placeholder:text-steel/50 focus:border-gold/50 focus:outline-none";

const INITIAL_STATE: CreatePlayerState = { success: false };

/**
 * Une erreur de validation (PIN invalide, prénom manquant) ou d'écriture en
 * base ne doit jamais faire planter la route sur l'error boundary globale —
 * createPlayer() renvoie un état structuré (useActionState) plutôt que de
 * jeter une exception, pour rester sur le formulaire avec un message clair.
 */
export function NewPlayerForm() {
  const [state, formAction, isPending] = useActionState(createPlayer, INITIAL_STATE);
  const pinRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.fieldErrors?.pin) {
      pinRef.current?.focus();
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Field
          label="Prénom"
          name="first_name"
          required
          aria-invalid={!!state.fieldErrors?.first_name}
          aria-describedby={state.fieldErrors?.first_name ? "first_name-error" : undefined}
        />
        {state.fieldErrors?.first_name && (
          <p id="first_name-error" role="alert" className="mt-1 text-xs font-medium text-red-400">
            {state.fieldErrors.first_name}
          </p>
        )}
      </div>

      <Field label="Nom" name="last_name" />
      <Field label="Surnom" name="nickname" />

      <div className="grid grid-cols-2 gap-3">
        <Field label="Numéro de maillot" name="shirt_number" type="number" />
        <Field label="Poste" name="primary_position" />
      </div>

      <div>
        <label className="block text-sm font-medium text-cream" htmlFor="pin">
          PIN (6 chiffres)
        </label>
        <input
          ref={pinRef}
          id="pin"
          name="pin"
          type="text"
          inputMode="numeric"
          pattern="\d{6}"
          minLength={6}
          maxLength={6}
          required
          aria-invalid={!!state.fieldErrors?.pin}
          aria-describedby={state.fieldErrors?.pin ? "pin-error" : undefined}
          className={INPUT_CLASSES}
        />
        {state.fieldErrors?.pin && (
          <p id="pin-error" role="alert" className="mt-1 text-xs font-medium text-red-400">
            {state.fieldErrors.pin}
          </p>
        )}
      </div>

      {state.message && (
        <p role="alert" className="text-xs font-medium text-red-400">
          {state.message}
        </p>
      )}

      <Button type="submit" variant="primary" shape="block" disabled={isPending}>
        {isPending ? "Ajout…" : "Ajouter"}
      </Button>
    </form>
  );
}
