"use client";

import { useState } from "react";

/**
 * Gestion purement locale et éphémère du nom facultatif du bénéficiaire.
 * INVARIANTS :
 * - Aucune transmission réseau (ni GET, ni POST, ni query param URL).
 * - Aucun stockage persistant (pas de localStorage, cookies, sessionStore).
 * - Saisie interactive sur écran, masquée à l'impression.
 * - Le nom saisi (ou "Bénévole CleanMyMap" par défaut) s'imprime en clair dans le récapitulatif.
 * - Limité strictement à 60 caractères.
 */
export function PrintBeneficiaryField() {
  const [name, setName] = useState("");

  const displayName = name.trim() || "Bénévole CleanMyMap";

  return (
    <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4 space-y-2">
      <div className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">
        Bénéficiaire (identité déclarée)
      </div>

      {/* Affichage d'impression : uniquement le texte en clair, sans champ de saisie */}
      <div className="hidden print:block text-base font-bold text-zinc-900">
        {displayName}
      </div>

      {/* Saisie interactive sur écran (masquée à l'impression) */}
      <div className="print:hidden space-y-1.5">
        <label
          htmlFor="declared-name-input"
          className="text-xs text-zinc-600 block"
        >
          Nom ou prénom (facultatif, renseigné localement pour l&apos;impression sans transmission ni enregistrement) :
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <input
            id="declared-name-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Bénévole CleanMyMap (cliquez pour personnaliser)"
            maxLength={60}
            className="w-full max-w-md text-sm font-semibold rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:font-normal placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {name.trim() && (
            <button
              type="button"
              onClick={() => setName("")}
              className="text-xs text-zinc-500 hover:text-zinc-700 underline"
            >
              Effacer
            </button>
          )}
        </div>
        <p className="text-xs text-zinc-500">
          Aperçu sur le document : <strong className="text-zinc-900">{displayName}</strong>
        </p>
      </div>
    </div>
  );
}
