"use client";
import type { ReactNode } from "react";
import { MapPin, Globe, MessageSquare, ChevronDown } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import type { EnrichedAnnuaireEntry } from "./annuaire-helpers";
import { CONTRIBUTION_LABELS, formatAssociationImpactDate, formatAnnuaireCoverage, getAssociationImpactSummary, getAnnuairePublicDestination, hasTraceableImpactHistory, hasTraceablePastActions, isEditorialAnnuaireEntry, isPublishedPartnerAnnuaireEntry } from "./annuaire-helpers";
import type { AssociationProfile } from "@/lib/partners/annuaire-types";
import { getAssociationProfile } from "./annuaire-association-profile";
import { normalizePublicWebUrl } from "@/lib/partners/onboarding-types";
import { isPrivateOrUnauthorizedInviteUrl } from "@/lib/partners/paris-cleanwalk-network.channels";
import type { PublicStructureContext } from "@/lib/partners/public-structure-context";
import { PublicStructureContextPanel } from "./public-structure-context-panel";

type DrawerCommonProps = { entry: EnrichedAnnuaireEntry; fr: boolean };

export function DrawerSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-2xl border border-[var(--cmm-surface-border)] bg-[var(--cmm-surface-background-muted)] p-4"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold cmm-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500">
        <span>{title}</span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className="shrink-0 transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="mt-4 space-y-4">{children}</div>
    </details>
  );
}

function AnnuaireDrawerOverviewSection({
  entry,
  fr,
  associationProfile,
}: DrawerCommonProps & { associationProfile: AssociationProfile | null }) {
  const isPublished = isPublishedPartnerAnnuaireEntry(entry);
  return (
    <DrawerSection title={fr ? "Présentation" : "Overview"} defaultOpen>
      <p className="text-xs cmm-text-secondary">{entry.legalIdentity}</p>
      <p className="text-sm leading-relaxed cmm-text-primary">{entry.description}</p>
      {entry.provenance === "editorial_seed" && entry.publicAddress ? (
        <div className="rounded-xl border border-[var(--cmm-surface-border)] p-3">
          <p className="text-xs font-semibold cmm-text-secondary">{fr ? "Adresse publique documentée" : "Documented public address"}</p>
          <p className="text-sm font-semibold cmm-text-primary">{entry.publicAddress.label}</p>
          <p className="mt-1 text-xs cmm-text-secondary">{fr ? "Adresse d'établissement ; ne vaut pas autorisation d'accès ou de dépôt." : "Establishment address; not permission to enter or drop off waste."}</p>
          {normalizePublicWebUrl(entry.publicAddress.sourceUrl) ? <a href={normalizePublicWebUrl(entry.publicAddress.sourceUrl)!} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs cmm-text-primary underline">{fr ? "Source consultée le" : "Source checked on"} {entry.publicAddress.checkedAt}</a> : null}
        </div>
      ) : entry.provenance === "editorial_seed" ? (
        <div className="rounded-xl border border-dashed border-[var(--cmm-surface-border)] p-3 text-xs cmm-text-secondary">
          {entry.schoolProfile?.addresses && entry.schoolProfile.addresses.length > 1
            ? fr
              ? "Plusieurs adresses sources divergentes (à vérifier dans les sources scolaires)."
              : "Multiple conflicting source addresses (check school sources)."
            : entry.kind === "evenement"
              ? fr
                ? "Plateforme ou programme sans adresse physique dédiée."
                : "Platform or programme without a dedicated physical address."
              : fr
                ? "Adresse publique d'établissement non établie."
                : "Public establishment address not established."}
        </div>
      ) : null}
      {entry.featuredReason ? (
        <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3">
          <p className="text-sm italic leading-relaxed cmm-text-primary">
            « {entry.featuredReason} »
          </p>
        </div>
      ) : null}
      {associationProfile ? (
        <div className="space-y-1 rounded-xl border border-[var(--cmm-surface-border)] p-3">
          <p className="text-xs font-semibold cmm-text-secondary">
            {fr ? "Mission associative" : "Association mission"}
          </p>
          <p className="text-sm leading-relaxed cmm-text-primary">{associationProfile.mission}</p>
        </div>
      ) : null}
      <div className="flex items-start gap-3">
        <MapPin size={16} className="mt-0.5 shrink-0 text-violet-400" aria-hidden="true" />
        <div>
          <p className="text-xs font-semibold cmm-text-secondary">
            {fr ? "Ancrage territorial" : "Territorial base"}
          </p>
          <p className="text-sm font-semibold cmm-text-primary">{formatAnnuaireCoverage(entry)}</p>
        </div>
      </div>
      {isPublished && "availability" in entry && entry.availability ? (
        <div>
          <p className="text-xs font-semibold cmm-text-secondary">
            {fr ? "Disponibilité déclarée" : "Declared availability"}
          </p>
          <p className="text-sm font-semibold cmm-text-primary">{entry.availability}</p>
        </div>
      ) : null}
      {entry.tags?.length ? (
        <div className="flex flex-wrap gap-2">
          {entry.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md border border-[var(--cmm-surface-border)] px-2.5 py-1 text-xs font-semibold cmm-text-secondary"
            >
              {tag.toUpperCase()}
            </span>
          ))}
        </div>
      ) : null}
    </DrawerSection>
  );
}

function AnnuaireDrawerImpactSection({
  entry,
  fr,
  associationProfile,
}: DrawerCommonProps & { associationProfile: AssociationProfile }) {
  const hasImpact = hasTraceableImpactHistory(entry);
  const hasActions = hasTraceablePastActions(entry);
  return (
    <DrawerSection title={fr ? "Actions et impact" : "Actions and impact"}>
      <div className="rounded-xl border border-[var(--cmm-surface-border)] p-3">
        <p className="text-xs font-semibold cmm-text-secondary">
          {fr ? "Impact mesuré" : "Measured impact"}
        </p>
        <p className="mt-1 text-sm font-semibold cmm-text-primary">
          {hasImpact ? getAssociationImpactSummary(entry) : fr ? "Non renseigné" : "Not provided"}
        </p>
        <p className="mt-1 text-xs cmm-text-secondary">
          {hasImpact
            ? formatAssociationImpactDate(associationProfile.impactHistory?.lastActionAt)
            : fr
              ? "Date non renseignée"
              : "Date not provided"}
        </p>
        {hasImpact ? (
          <p className="mt-1 text-xs cmm-text-secondary">
            Source : {associationProfile.impactHistory?.provenance?.source}
          </p>
        ) : null}
      </div>
      <div className="space-y-2">
        <p className="text-xs font-semibold cmm-text-secondary">
          {fr ? "Actions passées" : "Past actions"}
        </p>
        {hasActions ? (
          <ul className="m-0 list-none space-y-2 p-0">
            {associationProfile.pastActions.map((action) => (
              <li
                key={action}
                className="rounded-xl border border-[var(--cmm-surface-border)] p-3 text-sm cmm-text-primary"
              >
                {action}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm cmm-text-secondary">{fr ? "Non renseigné" : "Not provided"}</p>
        )}
        {hasActions && associationProfile.pastActionsProvenance?.source ? (
          <p className="text-xs cmm-text-secondary">
            Source : {associationProfile.pastActionsProvenance.source}
          </p>
        ) : null}
      </div>
    </DrawerSection>
  );
}

function AnnuaireDrawerNeedsSection({
  entry,
  fr,
  associationProfile,
}: DrawerCommonProps & { associationProfile: AssociationProfile | null }) {
  return (
    <DrawerSection title={fr ? "Besoins et contributions" : "Needs and contributions"}>
      <div className="space-y-2">
        <p className="text-xs font-semibold cmm-text-secondary">
          {fr ? "Champs d'intervention" : "Areas of intervention"}
        </p>
        <div className="flex flex-wrap gap-2">
          {entry.contributionTypes.map((type) => (
            <span
              key={type}
              className="rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-semibold cmm-text-primary"
            >
              {CONTRIBUTION_LABELS[type] || type}
            </span>
          ))}
        </div>
      </div>
      {associationProfile?.recurringNeeds.length ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold cmm-text-secondary">
            {fr ? "Besoins récurrents" : "Recurring needs"}
          </p>
          <div className="flex flex-wrap gap-2">
            {associationProfile.recurringNeeds.map((need) => (
              <span
                key={need}
                className="rounded-full border border-[var(--cmm-surface-border)] px-3 py-1 text-xs font-semibold cmm-text-primary"
              >
                {need}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      {associationProfile?.publicCalls.length ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold cmm-text-secondary">
            {fr ? "Appels à contribution" : "Calls for contribution"}
          </p>
          {associationProfile.publicCalls.map((call) => (
            <div
              key={`${call.type}-${call.label}`}
              className="rounded-xl border border-[var(--cmm-surface-border)] p-3"
            >
              <p className="text-sm font-semibold cmm-text-primary">{call.label}</p>
              {call.detail ? (
                <p className="mt-1 text-xs leading-relaxed cmm-text-primary">{call.detail}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </DrawerSection>
  );
}

function AnnuaireDrawerContactsSection({
  entry,
  fr,
  isEditorial,
  publicDestination,
}: DrawerCommonProps & {
  isEditorial: boolean;
  publicDestination: ReturnType<typeof getAnnuairePublicDestination>;
}) {
  const websiteUrl = normalizePublicWebUrl(entry.websiteUrl);
  const extraChannels = [{label:"Instagram",url:entry.instagramUrl},{label:"Facebook",url:entry.facebookUrl}].flatMap(item=>{const url=normalizePublicWebUrl(item.url);return url&&!isPrivateOrUnauthorizedInviteUrl(url)&&url!==websiteUrl&&url!==publicDestination?.url?[{label:item.label,url}]:[];});
  return (
    <DrawerSection title={fr ? "Contacts publics" : "Public contacts"}>
      <p className="text-xs cmm-text-secondary">
        {fr
          ? "Seuls les canaux publics explicitement validés sont affichés."
          : "Only explicitly validated public channels are displayed."}
      </p>
      <div className="flex flex-wrap gap-2">
        {websiteUrl ? (
          <CmmButton
            asChild
            tone="secondary"
            variant="default"
            ariaLabel={`${fr ? "Consulter le site" : "Visit website"} — ${entry.name}`}
          >
            <a href={websiteUrl} target="_blank" rel="noopener noreferrer">
              <Globe size={16} className="mr-2" aria-hidden="true" />
              {fr ? "Consulter le site" : "Visit website"}
            </a>
          </CmmButton>
        ) : (
          <CmmButton
            type="button"
            disabled
            tone="secondary"
            variant="default"
            ariaLabel={fr ? "Site indisponible" : "Website unavailable"}
          >
            <Globe size={16} className="mr-2" aria-hidden="true" />
            {fr ? "Site indisponible" : "Website unavailable"}
          </CmmButton>
        )}
        {extraChannels.map(channel=><a key={channel.url} href={channel.url} target="_blank" rel="noopener noreferrer" className="underline cmm-text-info">{channel.label}</a>)}
        {publicDestination ? (
          <CmmButton
            asChild
            tone="primary"
            variant="default"
            ariaLabel={`${publicDestination.label} — ${entry.name}`}
          >
            <a href={publicDestination.url} target="_blank" rel="noopener noreferrer">
              <MessageSquare size={16} className="mr-2" aria-hidden="true" />
              {isEditorial
                ? fr
                  ? "Consulter la ressource"
                  : "View resource"
                : fr
                  ? "Engager le contact"
                  : "Get in touch"}
            </a>
          </CmmButton>
        ) : (
          <CmmButton
            type="button"
            disabled
            tone="primary"
            variant="default"
            ariaLabel={fr ? "Canal public indisponible" : "Public channel unavailable"}
          >
            <MessageSquare size={16} className="mr-2" aria-hidden="true" />
            {isEditorial
              ? fr
                ? "Ressource indisponible"
                : "Resource unavailable"
              : fr
                ? "Contact indisponible"
                : "Contact unavailable"}
          </CmmButton>
        )}
      </div>
    </DrawerSection>
  );
}

function AnnuaireDrawerSourcesSection({
  entry,
  fr,
  associationProfile,
  structureContext,
}: DrawerCommonProps & {
  associationProfile: AssociationProfile | null;
  structureContext?: PublicStructureContext | null;
}) {
  const resources = associationProfile?.usefulResources ?? [];
  return (
    <DrawerSection title={fr ? "Sources et limites" : "Sources and limitations"}>
      {resources.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold cmm-text-secondary">
            {fr ? "Ressources utiles" : "Useful resources"}
          </p>
          {resources.map((resource) => {
            const resourceUrl = normalizePublicWebUrl(resource.url);
            return resourceUrl ? (
              <a
                key={resource.label}
                href={resourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${resource.label} — ${entry.name}`}
                className="block rounded-xl border border-[var(--cmm-surface-border)] p-3 hover:border-violet-500/40"
              >
                <p className="text-sm font-semibold cmm-text-primary">{resource.label}</p>
                {resource.description ? (
                  <p className="mt-1 text-xs cmm-text-secondary">{resource.description}</p>
                ) : null}
              </a>
            ) : (
              <div
                key={resource.label}
                aria-disabled="true"
                className="rounded-xl border border-[var(--cmm-surface-border)] p-3 opacity-75"
              >
                <p className="text-sm font-semibold cmm-text-primary">{resource.label}</p>
                <p className="mt-1 text-xs cmm-text-secondary">
                  {fr ? "Ressource indisponible" : "Resource unavailable"}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs cmm-text-secondary">
          {fr ? "Ressources publiques à compléter" : "Public resources to be completed"}
        </p>
      )}
      <PublicStructureContextPanel fr={fr} context={structureContext??null}/>
    </DrawerSection>
  );
}

export function PublicDirectoryDetails({ entry, fr, structureContext }: DrawerCommonProps & {structureContext?:PublicStructureContext|null}) {
  const associationProfile = getAssociationProfile(entry);
  return <>
    <AnnuaireDrawerOverviewSection entry={entry} fr={fr} associationProfile={associationProfile} />
    {associationProfile ? <AnnuaireDrawerImpactSection entry={entry} fr={fr} associationProfile={associationProfile} /> : null}
    {entry.contributionTypes.length > 0 || associationProfile ? <AnnuaireDrawerNeedsSection entry={entry} fr={fr} associationProfile={associationProfile} /> : null}
    <AnnuaireDrawerContactsSection entry={entry} fr={fr} isEditorial={isEditorialAnnuaireEntry(entry)} publicDestination={getAnnuairePublicDestination(entry)} />
    <AnnuaireDrawerSourcesSection entry={entry} fr={fr} associationProfile={associationProfile} structureContext={structureContext}/>
  </>;
}
