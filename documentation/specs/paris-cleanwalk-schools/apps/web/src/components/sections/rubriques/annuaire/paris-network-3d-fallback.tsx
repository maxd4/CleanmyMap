"use client";

import {
  EQUIPMENT_STATUS_LABELS,
  PARIS_ACTOR_CATEGORY_META,
  PARIS_RELATION_TYPE_META,
  computeRelationThickness,
  type ParisActorCategory,
  type ParisCleanwalkActor,
  type ParisCleanwalkRelation,
} from "@/lib/partners/paris-cleanwalk-network";
import { getConnectedActorIds } from "./paris-network-3d.model";

interface ParisNetwork3DFallbackProps {
  actors: readonly ParisCleanwalkActor[];
  relations: readonly ParisCleanwalkRelation[];
  selectedActorId: string | null;
  hoveredActorId: string | null;
  onSelectActor: (actorId: string) => void;
  onSelectRelation?: (relationId: string) => void;
  onHoverActor: (actorId: string | null) => void;
  reason: "webgl_unavailable" | "user_selected";
  fr: boolean;
}

const CATEGORY_ORDER: ParisActorCategory[] = [
  "association_locale",
  "reseau_evenement",
  "collectivite_mairie",
  "entreprise_rse",
  "plateforme_mise_en_relation",
  "etablissement_enseignement",
];

export function ParisNetwork3DFallback({
  actors,
  relations,
  selectedActorId,
  hoveredActorId,
  onSelectActor,
  onSelectRelation,
  onHoverActor,
  reason,
  fr,
}: ParisNetwork3DFallbackProps) {
  const activeFocusId = selectedActorId ?? hoveredActorId;
  const connectedIds = getConnectedActorIds(activeFocusId, relations);
  const actorNameById = new Map(actors.map((a) => [a.id, a.name]));

  return (
    <div
      className="flex h-full flex-col gap-4 overflow-y-auto rounded-2xl border border-violet-300/20 bg-slate-950/80 p-4"
      role="region"
      aria-label={
        fr
          ? "Repli HTML interactif du réseau des cleanwalks à Paris"
          : "Interactive HTML fallback of the Paris cleanwalks network"
      }
    >
      <div className="rounded-xl border border-indigo-400/25 bg-indigo-500/10 px-3 py-2 text-xs text-indigo-100">
        {reason === "webgl_unavailable"
          ? fr
            ? "WebGL indisponible sur cet appareil : affichage du repli HTML interactif complet."
            : "WebGL unavailable on this device: displaying the full interactive HTML fallback."
          : fr
            ? "Vue HTML accessible active : explorez les clusters par famille et leurs relations sourcées."
            : "Accessible HTML view active: explore family clusters and sourced relations."}
      </div>

      {actors.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-slate-300">
          {fr
            ? "Aucun acteur ne correspond aux filtres sélectionnés."
            : "No actor matches the selected filters."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {CATEGORY_ORDER.map((category) => {
            const groupActors = actors.filter((a) => a.category === category);
            if (groupActors.length === 0) return null;
            const meta = PARIS_ACTOR_CATEGORY_META[category];

            return (
              <section
                key={category}
                aria-label={meta.label}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
              >
                <div className="mb-2.5 flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: meta.colorHex }}
                    aria-hidden="true"
                  />
                  <h4 className="text-xs font-black uppercase tracking-wider text-violet-200">
                    {meta.label}
                  </h4>
                </div>

                <div className="space-y-2">
                  {groupActors.map((actor) => {
                    const isSelected = selectedActorId === actor.id;
                    const isDimmed =
                      activeFocusId !== null && !connectedIds.has(actor.id);
                    const actorLinks = relations.filter(
                      (r) => r.sourceId === actor.id || r.targetId === actor.id,
                    );

                    return (
                      <div key={actor.id} className="space-y-1">
                      <button
                        type="button"
                        onClick={() => onSelectActor(actor.id)}
                        onMouseEnter={() => onHoverActor(actor.id)}
                        onMouseLeave={() => onHoverActor(null)}
                        aria-pressed={isSelected}
                        className={`w-full rounded-xl border p-3 text-left transition-all focus:outline-none focus:ring-2 focus:ring-violet-400 ${
                          isSelected
                            ? "border-violet-400 bg-violet-500/20 shadow-lg"
                            : "border-white/10 bg-slate-900/70 hover:border-violet-300/40"
                        } ${isDimmed ? "opacity-45" : "opacity-100"}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-black text-white">
                            {actor.name}
                          </span>
                          <span className="text-xs font-bold text-violet-300">
                            {actorLinks.length}{" "}
                            {fr ? "lien(s)" : "link(s)"}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-300">
                          {actor.parisZone.label}
                        </p>
                        <p className="mt-1 text-xs text-slate-300">
                          {EQUIPMENT_STATUS_LABELS[actor.equipmentAvailability.status]}
                        </p>
                        {actorLinks.some(rel => rel.relationType !== "collaboration_programmee") ? (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {actorLinks.filter(rel => rel.relationType !== "collaboration_programmee").map((rel) => {
                              const peerId =
                                rel.sourceId === actor.id ? rel.targetId : rel.sourceId;
                              const { operationsCount12m } =
                                computeRelationThickness(rel);
                              return (
                                <span
                                  key={rel.id}
                                  className="rounded-md border border-violet-300/20 bg-violet-500/10 px-1.5 py-0.5 text-xs font-semibold text-violet-200"
                                >
                                  {PARIS_RELATION_TYPE_META[rel.relationType].label} →{" "}
                                  {actorNameById.get(peerId) ?? peerId}
                                  {operationsCount12m !== null
                                    ? ` (${operationsCount12m} op.)`
                                    : ""}
                                </span>
                              );
                            })}
                          </div>
                        ) : null}
                      </button>
                      {actorLinks.filter(rel=>rel.relationType==="collaboration_programmee").map(rel => <button key={rel.id} type="button" onClick={()=>onSelectRelation?.(rel.id)} disabled={!onSelectRelation} className="rounded-md border border-dashed border-amber-400/60 bg-amber-500/10 px-2 py-1 text-left text-xs font-semibold text-amber-300 focus-visible:ring-2 focus-visible:ring-amber-400">{fr ? PARIS_RELATION_TYPE_META[rel.relationType].label : "Scheduled collaboration (declared)"} : {actorNameById.get(rel.sourceId===actor.id?rel.targetId:rel.sourceId)}</button>)}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
