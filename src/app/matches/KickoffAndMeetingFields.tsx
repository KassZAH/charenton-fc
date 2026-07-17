"use client";

import { useState } from "react";

const OFFSETS_MINUTES = [15, 30, 45, 60];

function subtractMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = ((h * 60 + m - minutes) % 1440 + 1440) % 1440;
  const hh = String(Math.floor(total / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function KickoffAndMeetingFields({
  initialKickoff = "",
  initialMeeting = "",
}: {
  initialKickoff?: string;
  initialMeeting?: string;
}) {
  const [kickoff, setKickoff] = useState(initialKickoff);
  const [meeting, setMeeting] = useState(initialMeeting);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-cream" htmlFor="kickoff_time">
            Coup d&apos;envoi
          </label>
          <input
            id="kickoff_time"
            type="time"
            name="kickoff_time"
            value={kickoff}
            onChange={(e) => setKickoff(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-cream focus:border-gold/50 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-cream" htmlFor="meeting_time">
            Heure de RDV
          </label>
          <input
            id="meeting_time"
            type="time"
            name="meeting_time"
            value={meeting}
            onChange={(e) => setMeeting(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-cream focus:border-gold/50 focus:outline-none"
          />
        </div>
      </div>
      {kickoff && (
        <div className="flex flex-wrap gap-2">
          {OFFSETS_MINUTES.map((mins) => (
            <button
              key={mins}
              type="button"
              onClick={() => setMeeting(subtractMinutes(kickoff, mins))}
              className="rounded-full border border-white/15 px-3 py-1 text-xs font-medium text-cream/80"
            >
              -{mins} min
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
