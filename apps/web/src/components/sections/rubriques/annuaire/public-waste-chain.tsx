"use client";
import type { CanonicalPublicEntityProjection } from "@/lib/partners/public-entity-projection";
import { PARIS_PUBLIC_CLEANLINESS_DATASET } from "@/lib/partners/public-cleanliness-organization";
import { DrawerSection } from "./public-directory-details";
import { PublicEvidenceLink, PublicEntityLink, type OpenPublicEntity } from "./public-entity-evidence";

// The stage memberships are presentation metadata for explicit canonical nodes.
// They are not a claim that one organization sends waste to another.
const STAGES = [
  {label:["Préparation et collecte","Preparation and collection"],ids:["participatory-cleaning","municipal-collection-regie","private-collectors","municipal-waste-channels","professional-waste-service"]},
  {label:["Stockage, dépôt et massification","Storage, drop-off and consolidation"],ids:["municipal-tri-sites","tri-site-lilas","operator-ckfd","syctom-transfer-romainville"]},
  {label:["Transport","Transport"],ids:["operator-carton-plein-cyclo","operator-ckfd"]},
  {label:["Traitement et valorisation","Treatment and recovery"],ids:["syctom","operator-mego","operator-trivalo-92","operator-asterya","operator-urbaser","operator-valoest","operator-semotris","operator-generis"]},
  {label:["Prévention et filières REP","Prevention and EPR schemes"],ids:["asso-megots-alcome","eco-organisme-citeo"]},
] as const;

export function PublicWasteChain({projection,fr,onOpen}:{projection:CanonicalPublicEntityProjection;fr:boolean;onOpen?:OpenPublicEntity}) {
  const node=projection.institution;
  if(!node)return null;
  const selected=node.id;
  const ids=new Set([selected,...projection.institutionRelations.filter(edge=>edge.kind==="service"||edge.kind==="programme").flatMap(edge=>[edge.from,edge.to])]);
  const sections=STAGES.map(stage=>({label:stage.label[fr?0:1],nodes:stage.ids.filter(id=>ids.has(id)).flatMap(id=>PARIS_PUBLIC_CLEANLINESS_DATASET.nodes.filter(item=>item.id===id))})).filter(stage=>stage.nodes.length);
  if(!sections.length)return null;
  return <DrawerSection title={fr?"Rôle dans les filières de déchets":"Role in waste streams"}>
    <p className="text-xs cmm-text-secondary">{fr?"Étapes documentées autour de la structure. Le classement ne prouve ni un transfert de déchets ni un accord de dépôt.":"Documented stages around this entity. Grouping does not establish waste transfers or drop-off agreements."}</p>
    <ol className="space-y-2">{sections.map(stage=><li key={stage.label} className="rounded-lg border border-[var(--cmm-surface-border)] p-3"><h4 className="font-semibold">{stage.label}</h4><ul>{stage.nodes.map(item=><li key={item.id} className="mt-2"><PublicEntityLink entity={{institutionId:item.id}} onOpen={onOpen}>{item.name}</PublicEntityLink><p>{item.description}</p><ul className="text-xs">{item.sourceIds.map(id=>{const source=PARIS_PUBLIC_CLEANLINESS_DATASET.sources.find(s=>s.id===id);return source?<li key={id}><PublicEvidenceLink url={source.url}>{source.label}</PublicEvidenceLink> · {source.verifiedAt}</li>:null;})}</ul></li>)}</ul></li>)}</ol>
  </DrawerSection>;
}
