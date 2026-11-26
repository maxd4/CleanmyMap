"use client";
import type { CanonicalPublicEntityProjection } from "@/lib/partners/public-entity-projection";
import { EQUIPMENT_STATUS_LABELS, PARTICIPATION_MODALITY_LABELS, PARIS_ACTOR_CATEGORY_META, PARIS_ACTOR_ROLE_LABELS, PARIS_ECOSYSTEM_ROLE_LABELS, sanitizeAndDeduplicatePublicChannels } from "@/lib/partners/paris-cleanwalk-network";
import { PublicDirectoryDetails, DrawerSection } from "./public-directory-details";
import { PublicEntityHistory, PublicEntityRelations, PublicEvidenceLink, PublicEntityLink, institutionName, STATUS, type OpenPublicEntity } from "./public-entity-evidence";
import { PublicStructureContextPanel } from "./public-structure-context-panel";
import { ScheduledOperationDetails } from "./paris-network-scheduled-operation";
import { getNetworkPublicAddress, getNetworkPublicLogo } from "@/lib/partners/public-network-identity-media";
import Image from "next/image";
import { VERIFIED_PRINCIPAL_LOCATIONS } from "./annuaire-geo-network.model";
import { PublicWasteChain } from "./public-waste-chain";

export function PublicEntityDetails({ projection: p, fr, onOpen, selectedRelationId }: { projection: CanonicalPublicEntityProjection; fr: boolean; onOpen?: OpenPublicEntity; selectedRelationId?: string|null }) {
  const actor = p.publicActor, institution = p.institution, entry = p.directoryEntry;
  const lang = fr ? 0 : 1;
  const logo = getNetworkPublicLogo(p.identity.networkActorId ?? p.identity.annuaireEntryId);
  const address = getNetworkPublicAddress(p.identity.networkActorId ?? p.identity.annuaireEntryId);
  const geoKey=p.identity.annuaireEntryId??p.identity.networkActorId;
  const geo=geoKey&&Object.hasOwn(VERIFIED_PRINCIPAL_LOCATIONS,geoKey)?VERIFIED_PRINCIPAL_LOCATIONS[geoKey]:null;
  const school = actor?.schoolProfile ?? (entry?.provenance === "editorial_seed" ? entry.schoolProfile : undefined);
  const contacts = sanitizeAndDeduplicatePublicChannels(actor?.publicChannels ?? []);
  return <div data-public-entity-details className="space-y-3 text-sm cmm-text-primary">
    {logo ? <Image src={logo.localPath} width={56} height={56} className="object-contain" alt={p.identity.name} /> : null}
    {entry ? <PublicDirectoryDetails entry={{...entry,distanceKm:null}} fr={fr} structureContext={p.structureContext}/> : null}
    {actor || institution || school ? <DrawerSection title={fr ? "Identité et compétences" : "Identity and responsibilities"} defaultOpen={!entry}>
      {entry ? <p>{entry.legalIdentity}</p> : null}
      {institution ? <><p>{institution.description}</p><p>{fr?"Type et service":"Kind and service"} : {institution.kind} · {institution.service} · {STATUS[institution.assignment][lang]}</p></> : null}
      {actor ? <><p>{PARIS_ACTOR_CATEGORY_META[actor.category].label}</p><p>{actor.roles.map(role=>PARIS_ACTOR_ROLE_LABELS[role]).join(" · ")}</p><p>{actor.ecosystemRoles.map(role=>PARIS_ECOSYSTEM_ROLE_LABELS[role]).join(" · ")}</p><ul className="list-disc pl-5">{actor.activities.map((activity,index)=><li key={index}>{activity}</li>)}</ul>{actor.platformStatus?.v2UnavailableFeaturesNote ? <p>{actor.platformStatus.v2UnavailableFeaturesNote}</p>:null}</>:null}
      {school ? <><p>UAI : {school.uai} · {school.level} · {school.sector}</p><ul>{school.sources.map(source=><li key={source.url}><PublicEvidenceLink url={source.url}>{source.label}</PublicEvidenceLink> · {school.verifiedAt}</li>)}</ul></>:null}
    </DrawerSection>:null}
    <DrawerSection title={fr ? "Implantations et territoires" : "Sites and territories"}>
      {geo ? <p><PublicEvidenceLink url={geo.sourceUrl}>{geo.address}</PublicEvidenceLink> · {geo.nature} · {geo.verifiedAt}<span className="block text-xs cmm-text-secondary">{geo.lat.toFixed(6)}, {geo.lng.toFixed(6)}</span></p> : address ? <p><PublicEvidenceLink url={address.sourceUrl}>{address.label}</PublicEvidenceLink> · {address.nature} · {address.checkedAt} · {fr?"Géocodage non établi":"Geocode not established"}</p> : null}
      {school ? <><ul>{school.addresses.map(a=><li key={a.sourceUrl+":"+a.label}><PublicEvidenceLink url={a.sourceUrl}>{a.label}</PublicEvidenceLink></li>)}</ul>{new Set(school.addresses.map(a=>a.label)).size>1?<p>{fr?"Adresses divergentes, à confirmer":"Conflicting addresses, to confirm"}</p>:null}</>:null}
      {p.territories.length ? <p>{fr?"Périmètre documenté":"Documented scope"} : {p.territories.join(", ")}</p> : null}
      {actor?.parisZone.scopeNote ? <p>{actor.parisZone.scopeNote}</p>:null}
      {actor?.parisZone.arrondissements.length ? <p>{fr?"Arrondissements":"Districts"} : {actor.parisZone.arrondissements.join(", ")}</p>:null}
      <p className="text-xs cmm-text-secondary">{fr?"Une implantation ne prouve pas la desserte, l'accès au local ni l'autorisation de dépôt.":"A site does not establish coverage, access or drop-off permission."}</p>
    </DrawerSection>
    {institution || actor?.publicLeader || p.institutionalPeople.length ? <DrawerSection title={fr?"Organisation et responsables":"Organization and office holders"}>
      {institution?.legalEmployerId ? <p>{fr?"Employeur juridique":"Legal employer"} : <PublicEntityLink entity={{institutionId:institution.legalEmployerId}} onOpen={onOpen}>{institutionName(institution.legalEmployerId)}</PublicEntityLink></p>:null}
      {institution?.unitId ? <p>{fr?"Rattachement":"Reporting unit"} : <PublicEntityLink entity={{institutionId:institution.unitId}} onOpen={onOpen}>{institutionName(institution.unitId)}</PublicEntityLink></p>:null}
      {actor?.publicLeader ? <p><PublicEvidenceLink url={actor.publicLeader.sourceUrl}>{actor.publicLeader.name}</PublicEvidenceLink> · {actor.publicLeader.roleTitle} · {actor.publicLeader.verifiedAt}</p>:null}
      <ul>{p.institutionalPeople.map(({person,assignments})=><li key={person.id}><PublicEntityLink entity={{institutionId:person.id}} onOpen={onOpen}>{person.name}</PublicEntityLink><ul>{assignments.map(({role,relation,status})=><li key={relation.id}><PublicEntityLink entity={{institutionId:role.id}} onOpen={onOpen}>{role.name}</PublicEntityLink> · {STATUS[status][lang]}</li>)}</ul></li>)}</ul>
    </DrawerSection>:null}
    {actor || p.institutionalContact ? <DrawerSection title={fr?"Contacts et participation":"Contacts and participation"}>
      {p.institutionalContact ? <p><PublicEvidenceLink url={p.institutionalContact.url}>{p.institutionalContact.label}</PublicEvidenceLink> · {p.institutionalContact.kind==="official_portal"?(fr?"Portail d’orientation":"Guidance portal"):(fr?"Contact fonctionnel":"Functional contact")}</p>:null}
      {actor?.officialWebsite ? <p><PublicEvidenceLink url={actor.officialWebsite}>{fr?"Site officiel":"Official website"}</PublicEvidenceLink></p>:null}
      {actor?.publicContact ? <p><PublicEvidenceLink url={actor.publicContact.url}>{actor.publicContact.label}</PublicEvidenceLink>{actor.publicContact.email?" · "+actor.publicContact.email:""} · {actor.publicContact.certainty}</p>:null}
      <ul>{contacts.map(ch=><li key={ch.url}><PublicEvidenceLink url={ch.url}>{ch.label}</PublicEvidenceLink> · <PublicEvidenceLink url={ch.provenance.sourceUrl}>{ch.provenance.sourceLabel}</PublicEvidenceLink> · {ch.provenance.verifiedAt} · {ch.provenance.certainty}</li>)}</ul>
      {actor?.participationModalities.length?<p>{fr?"Publics concernés":"Participation"} : {actor.participationModalities.map(mode=>PARTICIPATION_MODALITY_LABELS[mode]).join(" · ")}</p>:null}
    </DrawerSection>:null}
    {actor?<DrawerSection title={fr?"Services et moyens":"Services and equipment"}>
      <p>{EQUIPMENT_STATUS_LABELS[actor.equipmentAvailability.status]} · {actor.equipmentAvailability.certainty}</p><p>{actor.equipmentAvailability.summary}</p>
      {actor.equipmentAvailability.items?.length?<ul className="list-disc pl-5">{actor.equipmentAvailability.items.map(item=><li key={item}>{item}</li>)}</ul>:null}
      <PublicEvidenceLink url={actor.equipmentAvailability.sourceUrl}>{fr?"Source du matériel":"Equipment source"}</PublicEvidenceLink>
    </DrawerSection>:null}
    <PublicEntityRelations projection={p} fr={fr} onOpen={onOpen} selectedRelationId={selectedRelationId}/>
    {p.scheduledOperations.length?<DrawerSection title={fr?"Opérations programmées":"Scheduled operations"}>{p.scheduledOperations.map(op=><details key={op.id}><summary>{op.label} · {op.date}</summary><ScheduledOperationDetails operation={op} fr={fr}/></details>)}</DrawerSection>:null}
    {actor?.funding?.sources.length?<DrawerSection title={fr?"Financement":"Funding"}>
      <p>{actor.funding.entityName} · {actor.funding.period??(fr?"Période non établie":"Period not established")}</p>
      {actor.funding.calculationBase?<p>{actor.funding.calculationBase}</p>:null}
      <ul>{actor.funding.sources.map((source,index)=><li key={index}>{source.label}{source.sharePercent!=null?" · "+source.sharePercent+" %":""}{source.amountEur!=null?" · "+source.amountEur.toLocaleString(fr?"fr-FR":"en-GB")+" €":""}</li>)}</ul>
      {!actor.funding.sharesPublished?<p>{fr?"Parts non publiées":"Shares not published"}</p>:null}{actor.funding.notes?<p>{actor.funding.notes}</p>:null}
      <PublicEvidenceLink url={actor.funding.sourceUrl}>{fr?"Source consultée le":"Source checked on"} {actor.funding.verifiedAt}</PublicEvidenceLink>
    </DrawerSection>:null}
    {!entry?<PublicStructureContextPanel context={p.structureContext} fr={fr}/>:null}
    <PublicWasteChain projection={p} fr={fr} onOpen={onOpen}/>
    <PublicEntityHistory projection={p} fr={fr}/>
    <DrawerSection title={fr?"Sources et preuve":"Sources and evidence"}>
      {actor?<p><PublicEvidenceLink url={actor.provenance.sourceUrl}>{actor.provenance.sourceLabel}</PublicEvidenceLink> · {actor.verifiedAt} · {actor.provenance.certainty}{actor.provenance.secondarySourceUrl?<><span> · </span><PublicEvidenceLink url={actor.provenance.secondarySourceUrl}>{fr?"Source secondaire":"Secondary source"}</PublicEvidenceLink></>:null}</p>:null}
      <ul>{p.institutionSources.map(source=><li key={source.id}><PublicEvidenceLink url={source.url}>{source.label}</PublicEvidenceLink> · {source.evidence} · {source.verifiedAt}{source.sourceContentDate?" · "+source.sourceContentDate:""}</li>)}</ul>
      <ul>{p.sources.map(source=><li key={source.url+":"+source.label}><PublicEvidenceLink url={source.url}>{source.label}</PublicEvidenceLink> · {source.evidence} · {source.verifiedAt}</li>)}</ul>
    </DrawerSection>
  </div>;
}
