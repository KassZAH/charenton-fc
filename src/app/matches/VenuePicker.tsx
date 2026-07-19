"use client";

import { useRef } from "react";
import type { Venue } from "@/types/models";

/**
 * Sélectionner un terrain pré-remplit lieu/adresse/maps une seule fois (Lot 22, roadmap V3) —
 * jamais un lien permanent : les champs restent ensuite modifiables localement pour ce match
 * sans que le terrain d'origine ne soit affecté ni resynchronisé.
 */
export function VenuePicker({
  venues,
  initialVenueId = "",
  initialLocation = "",
  initialAddress = "",
  initialMapsUrl = "",
}: {
  venues: Venue[];
  initialVenueId?: string;
  initialLocation?: string;
  initialAddress?: string;
  initialMapsUrl?: string;
}) {
  const locationRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const mapsRef = useRef<HTMLInputElement>(null);

  function applyVenue(venueId: string) {
    const venue = venues.find((v) => v.id === venueId);
    if (!venue) return;
    if (locationRef.current) locationRef.current.value = venue.name;
    if (addressRef.current) addressRef.current.value = venue.address ?? "";
    if (mapsRef.current) mapsRef.current.value = venue.maps_url ?? "";
  }

  return (
    <div className="space-y-3">
      {venues.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-cream" htmlFor="venue_id">
            Terrain enregistré (facultatif, pré-remplit les champs ci-dessous)
          </label>
          <select
            id="venue_id"
            name="venue_id"
            defaultValue={initialVenueId}
            onChange={(e) => applyVenue(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-cream focus:border-gold/50 focus:outline-none"
          >
            <option value="">— Aucun —</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-cream" htmlFor="location">
          Lieu
        </label>
        <input
          ref={locationRef}
          id="location"
          type="text"
          name="location"
          defaultValue={initialLocation}
          className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-cream focus:border-gold/50 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-cream" htmlFor="address">
            Adresse
          </label>
          <input
            ref={addressRef}
            id="address"
            type="text"
            name="address"
            defaultValue={initialAddress}
            className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-cream focus:border-gold/50 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-cream" htmlFor="maps_url">
            Lien Google Maps
          </label>
          <input
            ref={mapsRef}
            id="maps_url"
            type="url"
            name="maps_url"
            defaultValue={initialMapsUrl}
            placeholder="https://maps.google.com/..."
            className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-cream placeholder:text-steel/50 focus:border-gold/50 focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
