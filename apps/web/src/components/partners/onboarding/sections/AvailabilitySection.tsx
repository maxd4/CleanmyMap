import React from "react";
import { WEEKDAY_OPTIONS, type PartnerAvailabilitySlot } from "@/lib/partners/onboarding-types";

export function AvailabilitySection({
  availabilitySlots,
  availabilityNote,
  setAvailabilityNote,
  updateAvailabilitySlot,
  addAvailabilitySlot,
  removeAvailabilitySlot,
}: {
  availabilitySlots: PartnerAvailabilitySlot[];
  availabilityNote: string;
  setAvailabilityNote: (v: string) => void;
  updateAvailabilitySlot: (index: number, key: keyof PartnerAvailabilitySlot, value: string) => void;
  addAvailabilitySlot: () => void;
  removeAvailabilitySlot: (index: number) => void;
}) {
  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="cmm-text-small font-semibold cmm-text-primary">Disponibilité</h3>
          <p className="mt-1 cmm-text-caption cmm-text-secondary">
            Ajoute un ou plusieurs créneaux récurrents, puis une précision si nécessaire.
          </p>
        </div>
        <button
          type="button"
          onClick={addAvailabilitySlot}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-small font-semibold cmm-text-secondary hover:bg-slate-100"
        >
          Ajouter
        </button>
      </div>
      <div className="space-y-3">
        {availabilitySlots.map((slot, index) => (
          <div
            key={`${slot.day}-${index}`}
            className="grid grid-cols-1 gap-2 rounded-lg border border-white bg-white p-3 md:grid-cols-[1fr_120px_120px_auto]"
          >
            <label className="space-y-1">
              <span className="cmm-text-caption font-semibold cmm-text-secondary">Jour</span>
              <select
                value={slot.day}
                onChange={(event) => updateAvailabilitySlot(index, "day", event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 cmm-text-small"
              >
                {WEEKDAY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="cmm-text-caption font-semibold cmm-text-secondary">Début</span>
              <input
                type="time"
                value={slot.start}
                onChange={(event) => updateAvailabilitySlot(index, "start", event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 cmm-text-small"
              />
            </label>
            <label className="space-y-1">
              <span className="cmm-text-caption font-semibold cmm-text-secondary">Fin</span>
              <input
                type="time"
                value={slot.end}
                onChange={(event) => updateAvailabilitySlot(index, "end", event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 cmm-text-small"
              />
            </label>
            <div className="flex items-end">
              <button
                type="button"
                disabled={availabilitySlots.length === 1}
                onClick={() => removeAvailabilitySlot(index)}
                className="w-full rounded-lg border border-rose-200 bg-white px-3 py-2 cmm-text-small font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Retirer
              </button>
            </div>
          </div>
        ))}
      </div>
      <label className="block space-y-1">
        <span className="cmm-text-caption font-semibold cmm-text-secondary">Précisions éventuelles</span>
        <textarea
          value={availabilityNote}
          onChange={(event) => setAvailabilityNote(event.target.value)}
          rows={2}
          placeholder="ex: sur demande, pendant les ateliers, en soirée..."
          className="w-full rounded-lg border border-slate-300 px-3 py-2 cmm-text-small"
        />
      </label>
    </section>
  );
}
