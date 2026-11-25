"use client";

import { useMemo, useState } from "react";
import type { ParisCleanwalkActor } from "@/lib/partners/paris-cleanwalk-network";
import { normalizeAnnuaireSearchText, tokenizeAnnuaireSearchQuery } from "./annuaire-helpers";

/** A name lookup selects a node; it does not remove its neighbours. */
export function ParisNetworkActorSearch({
  actors, fr, onSelectActor,
}: {
  actors: readonly ParisCleanwalkActor[];
  fr: boolean;
  onSelectActor: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const terms = tokenizeAnnuaireSearchQuery(query);
  const results = useMemo(() => {
    const tokens = tokenizeAnnuaireSearchQuery(query);
    if (!tokens.length) return [];
    return actors
      .filter(actor => {
        const name = normalizeAnnuaireSearchText(actor.name);
        return tokens.every(term => name.includes(term));
      })
      .sort((a, b) => a.name.localeCompare(b.name, fr ? "fr" : "en"));
  }, [actors, fr, query]);

  return <div className="space-y-2">
    <label className="block text-sm font-semibold cmm-text-primary">
      {fr ? "Rechercher un acteur" : "Find an actor"}
      <input
        type="search"
        value={query}
        onChange={event => setQuery(event.target.value)}
        placeholder={fr ? "Nom de la structure..." : "Organization name..."}
        data-cmm-field-control="input"
        className="cmm-field-control mt-1 block w-full text-sm"
      />
    </label>
    {terms.length > 0 ? <>
      <p role="status" className="text-sm cmm-text-secondary">
        {results.length ? (fr ? results.length + " résultat(s)" : results.length + " result(s)") : (fr ? "Aucun acteur documenté correspondant." : "No matching documented actor.")}
      </p>
      <ul className="max-h-48 space-y-1 overflow-y-auto">
        {results.map(actor => <li key={actor.id}>
          <button
            type="button"
            onClick={() => { onSelectActor(actor.id); setQuery(""); }}
            className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold cmm-text-primary hover:bg-violet-500/10 focus-visible:ring-2 focus-visible:ring-violet-400"
          >{actor.name}</button>
        </li>)}
      </ul>
    </> : null}
  </div>;
}
