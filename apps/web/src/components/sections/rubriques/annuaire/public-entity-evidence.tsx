"use client";
import type { ReactNode } from "react";
import type { CanonicalPublicEntityProjection, CanonicalPublicEntityRef } from "@/lib/partners/public-entity-projection";
import { PARIS_CLEANWALK_ACTORS, PARIS_RELATION_TYPE_META, computeRelationThickness, isSafeHttpUrl, isPrivateOrUnauthorizedInviteUrl } from "@/lib/partners/paris-cleanwalk-network";
import { PARIS_PUBLIC_CLEANLINESS_DATASET } from "@/lib/partners/public-cleanliness-organization";
import { getScheduledOperation } from "@/lib/partners/paris-cleanwalk-network.scheduled";
import { ScheduledOperationDetails } from "./paris-network-scheduled-operation";
import { DrawerSection } from "./public-directory-details";

export type OpenPublicEntity = (ref: CanonicalPublicEntityRef) => void;
export function PublicEvidenceLink({ url, children }: { url?: string | null; children: ReactNode }) {
  return url && isSafeHttpUrl(url) && !isPrivateOrUnauthorizedInviteUrl(url)
    ? <a href={url} target="_blank" rel="noopener noreferrer" className="break-words cmm-text-info underline underline-offset-2">{children}</a>
    : <span>{children}</span>;
}
export function PublicEntityLink({ entity, onOpen, children }: { entity: CanonicalPublicEntityRef; onOpen?: OpenPublicEntity; children: ReactNode }) {
  return onOpen ? <button type="button" className="text-left font-semibold cmm-text-info underline underline-offset-2" onClick={() => onOpen(entity)}>{children}</button> : <span className="font-semibold">{children}</span>;
}
const KIND = {
  hierarchy: ["Rattachement hiérarchique", "Reporting line"], mandate: ["Mandat", "Mandate"],
  assignment: ["Affectation", "Assignment"], coordination: ["Coordination", "Coordination"],
  cooperation: ["Coopération", "Cooperation"], programme: ["Programme", "Programme"], service: ["Prestation", "Service"],
} as const;
export const STATUS = { confirmed: ["Documenté", "Documented"], historical: ["Historique", "Historical"], unknown: ["Non établi", "Not established"] } as const;
const actorName = (id: string) => PARIS_CLEANWALK_ACTORS.find(a => a.id === id)?.name ?? id;
export const institutionName = (id: string) => PARIS_PUBLIC_CLEANLINESS_DATASET.nodes.find(n => n.id === id)?.name ?? id;

export function PublicEntityRelations({ projection, fr, onOpen, selectedRelationId }: { projection: CanonicalPublicEntityProjection; fr: boolean; onOpen?: OpenPublicEntity; selectedRelationId?: string|null }) {
  const lang = fr ? 0 : 1;
  const count = projection.relations.length + projection.institutionRelations.length;
  return <DrawerSection title={(fr ? "Relations (" : "Relationships (") + count + ")"} defaultOpen={Boolean(selectedRelationId)}>
    {!count ? <p className="text-xs cmm-text-secondary">{fr ? "Aucune relation renseignée dans le registre. Cela ne prouve pas une absence de coopération." : "No relationship recorded. This does not establish that cooperation is absent."}</p> : null}
    {projection.institutionRelations.map(edge => <details key={"institution:"+edge.id} data-relation-id={edge.id} open={selectedRelationId===edge.id?true:undefined} className="rounded-xl border border-[var(--cmm-surface-border)] p-3">
      <summary className="cursor-pointer font-semibold">{KIND[edge.kind][lang]} · {STATUS[edge.status][lang]}</summary>
      <p className="mt-2"><PublicEntityLink entity={{institutionId:edge.from}} onOpen={onOpen}>{institutionName(edge.from)}</PublicEntityLink> → <PublicEntityLink entity={{institutionId:edge.to}} onOpen={onOpen}>{institutionName(edge.to)}</PublicEntityLink></p>
      {edge.validFrom || edge.validUntil ? <p>{edge.validFrom ?? (fr ? "Début inconnu" : "Start unknown")} / {edge.validUntil ?? (fr ? "Fin non renseignée" : "End not provided")}</p> : null}
      <ul className="mt-2 text-xs">{edge.sourceIds.map(id => { const src = projection.institutionSources.find(s => s.id === id); return src ? <li key={id}><PublicEvidenceLink url={src.url}>{src.label}</PublicEvidenceLink> · {src.verifiedAt}</li> : null; })}</ul>
    </details>)}
    {projection.relations.map(rel => {
      const scheduled = rel.relationType === "collaboration_programmee";
      const operation = scheduled ? getScheduledOperation(rel.operationId) : undefined;
      const count12m = scheduled ? null : computeRelationThickness(rel).operationsCount12m;
      return <details key={"network:"+rel.id} data-relation-id={rel.id} open={selectedRelationId===rel.id?true:undefined} className="rounded-xl border border-[var(--cmm-surface-border)] p-3">
        <summary className="cursor-pointer font-semibold">{rel.title} · {PARIS_RELATION_TYPE_META[rel.relationType].label}</summary>
        <p className="mt-2"><PublicEntityLink entity={{networkActorId:rel.sourceId}} onOpen={onOpen}>{actorName(rel.sourceId)}</PublicEntityLink> → <PublicEntityLink entity={{networkActorId:rel.targetId}} onOpen={onOpen}>{actorName(rel.targetId)}</PublicEntityLink></p>
        <p>{rel.summary}</p>
        {scheduled ? <p>{fr ? "Programmée, déclaration de l’organisateur" : "Scheduled, organizer declaration"} · {rel.source.declaredOn}</p> : <p>{rel.source.certainty === "verifie" ? (fr ? "Documentée" : "Documented") : (fr ? "À confirmer" : "To confirm")} · <PublicEvidenceLink url={rel.source.url}>{rel.source.label}</PublicEvidenceLink> · {rel.source.verifiedAt}</p>}
        {rel.relationType === "action_commune" ? <p>{fr ? "Opérations sur 12 mois : " : "Operations over 12 months: "}{count12m ?? (fr ? "Non renseigné" : "Not provided")}</p> : null}
        {rel.operations?.length ? <ul>{rel.operations.map(op => <li key={op.id+":"+op.date}>{op.date} · <PublicEvidenceLink url={op.sourceUrl}>{op.label}</PublicEvidenceLink></li>)}</ul> : null}
        {operation ? <ScheduledOperationDetails operation={operation} fr={fr}/> : null}
      </details>;
    })}
  </DrawerSection>;
}
export function PublicEntityHistory({ projection, fr }: { projection: CanonicalPublicEntityProjection; fr: boolean }) {
  const items = new Map<string, { date:string; label:string; qualification:string; url?:string }>();
  for (const edge of projection.institutionRelations) {
    const source = projection.institutionSources.find(s => edge.sourceIds.includes(s.id));
    for (const [date, label] of [[edge.validFrom, fr ? "Début documenté" : "Documented start"], [edge.validUntil, fr ? "Fin documentée" : "Documented end"]] as const) {
      if (date) items.set(edge.id+":"+label, {date,label:label+" : "+KIND[edge.kind][fr?0:1],qualification:STATUS[edge.status][fr?0:1],url:source?.url});
    }
  }
  for (const rel of projection.relations) if (rel.relationType === "action_commune" && rel.source.certainty === "verifie") {
    for (const op of rel.operations ?? []) items.set("operation:"+op.id+":"+op.date,{date:op.date,label:op.label,qualification:fr?"Opération documentée":"Documented operation",url:op.sourceUrl});
  }
  for (const op of projection.scheduledOperations) items.set("scheduled:"+op.id,{date:op.date,label:op.label,qualification:fr?"Programmée (déclaration)":"Scheduled (declaration)"});
  if (!items.size) return null;
  return <DrawerSection title={fr ? "Chronologie documentée" : "Documented timeline"}>
    <ol className="space-y-2">{[...items.entries()].sort((a,b)=>b[1].date.localeCompare(a[1].date)).map(([id,item])=><li key={id}><strong>{item.date}</strong> · <PublicEvidenceLink url={item.url}>{item.label}</PublicEvidenceLink><span className="block text-xs cmm-text-secondary">{item.qualification}</span></li>)}</ol>
  </DrawerSection>;
}
