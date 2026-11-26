"use client";
import Image from "next/image";
import { Building2, ExternalLink, MapPin, Network, Landmark } from "lucide-react";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmButton } from "@/components/ui/cmm-button";
import { cn } from "@/lib/utils";
import { CATALOG_FAMILIES, type CatalogRow } from "./annuaire-catalog.model";
import { formatFreshness, getEntryTrustState, CONTRIBUTION_LABELS } from "./annuaire-helpers";
import { PARIS_ACTOR_ROLE_LABELS } from "@/lib/partners/paris-cleanwalk-network";

type Props={row:CatalogRow;fr:boolean;compact?:boolean;onOpen:()=>void;onMap:(id:string)=>void;onInstitution:(id:string)=>void};

export function AnnuaireActorCard({row,fr,compact,onOpen,onMap,onInstitution}:Props){
  const p=row.projection,entry=p.directoryEntry;
  const name=p.identity.name;
  const initials=name.split(/\s+/).filter(Boolean).slice(0,2).map(word=>word[0]).join("").toUpperCase();
  const contributions=entry?.contributionTypes.map(type=>CONTRIBUTION_LABELS[type])??p.publicActor?.roles.map(role=>PARIS_ACTOR_ROLE_LABELS[role])??[];
  const state=entry?getEntryTrustState(entry):"editorial";
  const provenance=row.published?(state==="trusted"?(fr?"Fiche confirmée":"Confirmed profile"):(fr?"Fiche publiée":"Published profile")):fr?"Ressource éditoriale":"Editorial resource";
  return <CmmCard as="article" tone="slate" variant="outlined" size="sm" className={cn("h-full min-w-0 flex gap-3",compact?"flex-col md:flex-row md:items-center":"flex-col")}>
    <div className="min-w-0 flex flex-1 flex-col gap-2">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--cmm-surface-border)] bg-[var(--cmm-surface-background-muted)] text-sm font-bold cmm-text-secondary">
          {row.logo?<Image src={row.logo.localPath} alt="" width={48} height={48} className="h-full w-full object-contain"/>:initials||<Building2 aria-hidden="true" size={20}/>}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="break-words text-base font-bold cmm-text-primary"><button type="button" onClick={onOpen} className="text-left hover:underline">{name}</button></h3>
          <p className="text-xs cmm-text-secondary">{CATALOG_FAMILIES[row.family][fr?0:1]} · {provenance}</p>
          {p.institution?.assignment==="historical"?<p className="text-xs cmm-text-warning">{fr?"Information historique":"Historical information"}</p>:null}
        </div>
        {row.featured ? <span className="shrink-0 text-xs font-semibold cmm-text-secondary">{fr ? "À la une" : "Featured"}</span> : null}
      </div>
      <p className={cn("text-sm leading-relaxed cmm-text-primary",compact?"line-clamp-1":"line-clamp-2 min-h-[2.5rem]")}>{row.summary}</p>
      <p className="flex min-w-0 items-start gap-1.5 text-xs cmm-text-secondary"><MapPin size={13} className="mt-0.5 shrink-0" aria-hidden="true"/><span className="line-clamp-2">{row.territoryLabel||(fr?"Territoire non renseigné":"Scope not provided")}</span></p>
      {contributions.length?<p className="line-clamp-2 text-xs cmm-text-secondary">{entry?(row.published?(fr?"Contributions déclarées":"Declared contributions"):(fr?"Contributions repérées":"Listed contributions")):(fr?"Rôles documentés":"Documented roles")} : {contributions.join(", ")}</p>:null}
      {entry?.provenance==="published_partner"?<p className="text-xs cmm-text-secondary">{fr?"Disponibilité déclarée":"Declared availability"} : {entry.availability} · {formatFreshness(entry.lastUpdatedAt)}</p>:null}
      {row.neighbourCount!==null?<p className="text-xs cmm-text-secondary">{row.neighbourCount} {fr?"voisins documentés dans le registre":"documented neighbours in the registry"}</p>:null}
    </div>
    <div className={cn("flex flex-wrap items-center gap-2",compact?"md:max-w-[46%]":"mt-auto border-t border-[var(--cmm-surface-border)] pt-3")}>
      <CmmButton type="button" size="sm" tone="secondary" className={compact?"":"flex-1"} onClick={onOpen}>{fr?"Consulter la fiche":"View profile"}</CmmButton>
      {row.canLocate&&row.mapId?<CmmButton type="button" size="sm" tone="tertiary" variant="ghost" ariaLabel={(fr?"Localiser ":"Locate ")+name} onClick={()=>onMap(row.mapId!)}><MapPin size={16} aria-hidden="true"/></CmmButton>:null}
      {row.mapId?<CmmButton type="button" size="sm" tone="tertiary" variant="ghost" ariaLabel={(fr?"Explorer le réseau de ":"Explore network of ")+name} onClick={()=>onMap(row.mapId!)}><Network size={16} aria-hidden="true"/></CmmButton>:null}
      {p.identity.institutionId?<CmmButton type="button" size="sm" tone="tertiary" variant="ghost" ariaLabel={(fr?"Voir dans les services publics : ":"View public services: ")+name} onClick={()=>onInstitution(p.identity.institutionId!)}><Landmark size={16} aria-hidden="true"/></CmmButton>:null}
      {row.destination?<CmmButton asChild size="sm" tone="tertiary" variant="ghost" ariaLabel={(fr?"Ouvrir le canal public de ":"Open public channel of ")+name}><a href={row.destination} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} aria-hidden="true"/></a></CmmButton>:null}
    </div>
  </CmmCard>;
}
