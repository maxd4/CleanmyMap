"use client";

import { useId } from "react";
import {
  computeRelationThickness,
  isSafeHttpUrl,
  PARIS_RELATION_TYPE_META,
  type ParisCleanwalkActor,
  type ParisCleanwalkRelation,
} from "@/lib/partners/paris-cleanwalk-network";
import { getScheduledOperation } from "@/lib/partners/paris-cleanwalk-network.scheduled";
import { ParisNetwork3DBubble } from "./paris-network-3d-bubble";
import { ScheduledOperationDetails } from "./paris-network-scheduled-operation";

type Props = {
  actor: ParisCleanwalkActor | null;
  relation: ParisCleanwalkRelation | undefined;
  actors: readonly ParisCleanwalkActor[];
  relations: readonly ParisCleanwalkRelation[];
  fr: boolean;
  onSelectActor: (id: string) => void;
  onSelectRelation: (id: string) => void;
  onClose: () => void;
  onOpenInstitution?: () => void;
};

function RelationDetails({ relation, actors, fr, onClose, onSelectActor }: Pick<Props, "actors" | "fr" | "onClose" | "onSelectActor"> & { relation: ParisCleanwalkRelation }) {
  const titleId = useId();
  const operation = relation.relationType === "collaboration_programmee" ? getScheduledOperation(relation.operationId) : undefined;
  const count = computeRelationThickness(relation).operationsCount12m;
  const endpoints = [relation.sourceId, relation.targetId].map(id => actors.find(actor => actor.id === id));
  return <section role="dialog" aria-modal="false" aria-labelledby={titleId} className="space-y-3 rounded-xl border border-violet-300/20 p-4 text-sm text-slate-200">
    <div className="flex items-start justify-between gap-2">
      <h3 id={titleId} className="font-bold text-white">{relation.title}</h3>
      <button type="button" onClick={onClose} className="rounded px-2 py-1 text-xs underline focus-visible:ring-2 focus-visible:ring-violet-400">{fr ? "Fermer" : "Close"}</button>
    </div>
    <p className="font-semibold text-violet-200">{PARIS_RELATION_TYPE_META[relation.relationType].label}</p>
    <ul className="space-y-1">
      {endpoints.map((actor, i) => actor ? <li key={actor.id}>
        {relation.relationType === "publie_sur" ? <span>{i === 0 ? (fr ? "Publie : " : "Publisher: ") : (fr ? "Plateforme : " : "Platform: ")}</span> : null}
        <button type="button" onClick={() => onSelectActor(actor.id)} className="text-left font-semibold text-violet-200 underline focus-visible:ring-2 focus-visible:ring-violet-400">{actor.name}</button>
      </li> : null)}
    </ul>
    {operation ? <ScheduledOperationDetails operation={operation} fr={fr} /> : relation.relationType === "collaboration_programmee" ? <p>{fr ? "Déclaration d’organisateur ; détails non renseignés." : "Organizer declaration; details unavailable."}</p> : <>
      <p>{relation.summary}</p>
      <p>{relation.source.certainty === "verifie" ? (fr ? "Lien documenté" : "Documented link") : (fr ? "Lien à confirmer" : "Link to confirm")} · {relation.source.verifiedAt}</p>
      {relation.relationType === "action_commune" ? <p>{count === null ? (fr ? "Fréquence non renseignée" : "Frequency unknown") : count + (fr ? " opération(s) sur 12 mois" : " operation(s) in 12 months")}</p> : null}
      {isSafeHttpUrl(relation.source.url) ? <a href={relation.source.url} target="_blank" rel="noopener noreferrer" className="break-words text-violet-200 underline">{relation.source.label}</a> : null}
    </>}
  </section>;
}

export function ParisNetworkSelectionPanel({ actor, relation, actors, relations, fr, onSelectActor, onSelectRelation, onClose, onOpenInstitution }: Props) {
  if (relation) return <RelationDetails relation={relation} actors={actors} fr={fr} onClose={onClose} onSelectActor={onSelectActor} />;
  if (!actor) return <p className="rounded-xl border border-white/10 p-4 text-sm text-slate-200">{fr ? "Sélectionnez un acteur pour consulter sa fiche et ses relations." : "Select an actor to explore its details and relationships."}</p>;
  const names = new Map(actors.map(item => [item.id, item.name]));
  const links = relations.filter(item => item.sourceId === actor.id || item.targetId === actor.id);
  return <div className="min-w-0 space-y-3">
    {onOpenInstitution ? <button type="button" onClick={onOpenInstitution} className="w-full rounded-xl border border-sky-300/30 px-3 py-2 text-left text-sm font-semibold text-sky-200 hover:bg-sky-300/10 focus-visible:ring-2 focus-visible:ring-sky-400">{fr ? "Voir dans les services publics" : "View in public services"}</button> : null}
    <ParisNetwork3DBubble actor={actor} isLocked onClose={onClose} fr={fr} />
    <section aria-label={fr ? "Relations de l'acteur" : "Actor relationships"} className="rounded-xl border border-white/10 p-3 text-sm text-slate-300">
      <h3 className="font-bold text-white">{fr ? "Relations documentées" : "Documented relationships"}</h3>
      {links.length ? <ul className="mt-2 space-y-2">{links.map(item => <li key={item.id}>
        <button type="button" onClick={() => onSelectRelation(item.id)} className="w-full rounded-lg border border-white/10 p-2 text-left focus-visible:ring-2 focus-visible:ring-violet-400 hover:bg-white/5">
          <span className="block font-semibold text-violet-200">{item.title}</span>
          <span className="block break-words text-sm">{names.get(item.sourceId) ?? item.sourceId}{item.relationType === "publie_sur" ? " → " : " · "}{names.get(item.targetId) ?? item.targetId}</span>
        </button>
      </li>)}</ul> : <p className="mt-2 text-sm">{fr ? "Aucun lien renseigné. Cela ne signifie pas qu'il n'existe pas de collaboration." : "No documented links. This does not establish that collaborations are absent."}</p>}
    </section>
  </div>;
}
