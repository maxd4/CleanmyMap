"use client";

import type { ReactNode, RefObject } from "react";
import { motion } from "framer-motion";
import {
  X,
  MapPin,
  Globe,
  Building2,
  Sparkles,
  MessageSquare,
  ChevronDown,
} from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import type { EnrichedAnnuaireEntry } from "./annuaire-helpers";
import {
  ENTITY_LABELS,
  CONTRIBUTION_LABELS,
  formatAssociationImpactDate,
  formatAnnuaireCoverage,
  getAssociationImpactSummary,
  getAnnuairePublicDestination,
  hasTraceableImpactHistory,
  hasTraceablePastActions,
  isEditorialAnnuaireEntry,
  isPublishedPartnerAnnuaireEntry,
} from "./annuaire-helpers";
import type { AssociationProfile } from "@/lib/partners/annuaire-types";
import { getAssociationProfile, getAssociationStructureBadge } from "./annuaire-association-profile";
import { normalizePublicWebUrl } from "@/lib/partners/onboarding-types";
import { cn } from "@/lib/utils";
import {
  PARIS_CLEANWALK_ACTORS,
  PARIS_CLEANWALK_RELATIONS,
  PARIS_RELATION_TYPE_META,
} from "@/lib/partners/paris-cleanwalk-network";
import { getActorStructureContext } from "@/lib/partners/public-structure-context";
import { PublicStructureContextPanel } from "./public-structure-context-panel";

type DrawerCommonProps = { entry: EnrichedAnnuaireEntry; fr: boolean };

function DrawerSection({
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

function AnnuaireDrawerHeader({
  entry,
  fr,
  drawerTitleId,
  structureBadge,
  closeButtonRef,
  onClose,
}: DrawerCommonProps & {
  drawerTitleId: string;
  structureBadge: ReturnType<typeof getAssociationStructureBadge>;
  closeButtonRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}) {
  return (
    <div className="flex-shrink-0 border-b border-[var(--cmm-surface-border)] bg-gradient-to-br from-violet-600/15 via-violet-500/5 to-transparent p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-semibold cmm-text-primary">
              <Building2 size={12} aria-hidden="true" />
              {ENTITY_LABELS[entry.kind] || entry.kind}
            </span>
            <span className="inline-flex items-center rounded-full border border-[var(--cmm-surface-border)] bg-[var(--cmm-surface-background-muted)] px-3 py-1 text-xs font-semibold cmm-text-secondary">
              {entry.provenance === "editorial_seed"
                ? fr
                  ? "Ressource éditoriale"
                  : "Editorial resource"
                : fr
                  ? "Fiche partenaire publiée"
                  : "Published partner profile"}
            </span>
            {structureBadge ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
                  structureBadge.tone === "success"
                    ? "border-emerald-500/20 bg-emerald-500/10 cmm-text-success"
                    : structureBadge.tone === "info"
                      ? "border-sky-500/20 bg-sky-500/10 cmm-text-info"
                      : "border-amber-500/20 bg-amber-500/10 cmm-text-warning",
                )}
              >
                <Sparkles size={12} aria-hidden="true" />
                {structureBadge.label}
              </span>
            ) : null}
          </div>
          <h2 id={drawerTitleId} className="text-2xl font-bold leading-tight cmm-text-primary">
            {entry.name}
          </h2>
        </div>
        <CmmButton
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          ariaLabel={fr ? "Fermer la fiche partenaire" : "Close partner profile"}
          tone="tertiary"
          variant="pill"
          className="shrink-0"
        >
          <X size={18} aria-hidden="true" />
        </CmmButton>
      </div>
    </div>
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
      <p className="text-sm leading-relaxed cmm-text-primary">{entry.description}</p>
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
  structureContext: ReturnType<typeof getActorStructureContext> | null;
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
      <PublicStructureContextPanel fr={fr} context={structureContext} />
    </DrawerSection>
  );
}

function AnnuaireDrawerRelationsSection({ entryId, fr }: { entryId: string; fr: boolean }) {
  const linkedActor = PARIS_CLEANWALK_ACTORS.find((actor) => actor.annuaireEntryId === entryId);
  if (!linkedActor) return null;
  const relations = PARIS_CLEANWALK_RELATIONS.filter(
    (rel) => rel.sourceId === linkedActor.id || rel.targetId === linkedActor.id,
  );
  if (relations.length === 0) return null;

  return (
    <DrawerSection title={fr ? `Relations (${relations.length})` : `Relations (${relations.length})`}>
      <ul className="m-0 list-none space-y-2 p-0">
        {relations.map((rel) => {
          const peerId = rel.sourceId === linkedActor.id ? rel.targetId : rel.sourceId;
          const peer = PARIS_CLEANWALK_ACTORS.find((actor) => actor.id === peerId);
          return (
            <li
              key={rel.id}
              className="rounded-xl border border-[var(--cmm-surface-border)] p-3 text-xs"
            >
              <p className="font-semibold cmm-text-primary">
                {peer?.name ?? peerId} · {PARIS_RELATION_TYPE_META[rel.relationType].label}
              </p>
              <p className="mt-1 cmm-text-secondary">{rel.summary}</p>
            </li>
          );
        })}
      </ul>
    </DrawerSection>
  );
}

function AnnuaireDrawerFooter({
  entry,
  fr,
  isEditorial,
  publicDestination,
  onClose,
}: DrawerCommonProps & {
  isEditorial: boolean;
  publicDestination: ReturnType<typeof getAnnuairePublicDestination>;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-3 border-t border-[var(--cmm-surface-border)] bg-[var(--cmm-surface-background)] p-4">
      <CmmButton type="button" onClick={onClose} tone="tertiary" variant="pill" className="flex-1">
        {fr ? "Fermer" : "Close"}
      </CmmButton>
      {publicDestination ? (
        <CmmButton
          asChild
          tone="primary"
          variant="default"
          ariaLabel={`${isEditorial ? (fr ? "Consulter la ressource" : "View resource") : fr ? "Engager le contact" : "Get in touch"} — ${entry.name}`}
          className="flex-[2]"
        >
          <a href={publicDestination.url} target="_blank" rel="noopener noreferrer">
            <span>
              {isEditorial
                ? fr
                  ? "Consulter la ressource"
                  : "View resource"
                : fr
                  ? "Engager le contact"
                  : "Get in touch"}
            </span>
            <MessageSquare size={16} className="ml-2" aria-hidden="true" />
          </a>
        </CmmButton>
      ) : (
        <CmmButton
          type="button"
          disabled
          tone="primary"
          variant="default"
          ariaLabel={fr ? "Canal public indisponible" : "Public channel unavailable"}
          className="flex-[2]"
        >
          <span>
            {isEditorial
              ? fr
                ? "Ressource indisponible"
                : "Resource unavailable"
              : fr
                ? "Contact indisponible"
                : "Contact unavailable"}
          </span>
          <MessageSquare size={16} className="ml-2" aria-hidden="true" />
        </CmmButton>
      )}
    </div>
  );
}

export function AnnuairePartnerDrawerPanel({
  drawerRef,
  closeButtonRef,
  drawerTitleId,
  entry,
  isOpen,
  onClose,
  fr,
  shouldReduceMotion,
}: DrawerCommonProps & {
  drawerRef: RefObject<HTMLDivElement | null>;
  closeButtonRef: RefObject<HTMLButtonElement | null>;
  drawerTitleId: string;
  isOpen: boolean;
  onClose: () => void;
  shouldReduceMotion: boolean | null;
}) {
  if (!isOpen) return null;
  const associationProfile = getAssociationProfile(entry);
  const structureBadge = getAssociationStructureBadge(entry);
  const isEditorial = isEditorialAnnuaireEntry(entry);
  const publicDestination = getAnnuairePublicDestination(entry);
  const structureContext =
    isEditorial &&
    PARIS_CLEANWALK_ACTORS.some(
      (actor) => actor.id === entry.id && actor.annuaireEntryId === entry.id,
    )
      ? getActorStructureContext(entry.id)
      : null;

  return (
    <>
      <motion.div
        data-motion-role="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-slate-950/75"
        onClick={onClose}
      />
      <motion.div
        ref={drawerRef}
        data-motion-role="overlay"
        initial={{ x: "110%", opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: "110%", opacity: 0 }}
        transition={
          shouldReduceMotion ? { duration: 0 } : { type: "spring", damping: 30, stiffness: 200 }
        }
        role="dialog"
        aria-modal="true"
        aria-labelledby={drawerTitleId}
        tabIndex={-1}
        className="fixed top-2 bottom-2 right-2 z-[110] flex w-[calc(100%-1rem)] max-w-[550px] flex-col overflow-hidden rounded-3xl border border-[var(--cmm-surface-border)] bg-[var(--cmm-surface-background)] shadow-2xl sm:top-4 sm:bottom-4 sm:right-4 sm:w-[calc(100%-2rem)]"
      >
        <AnnuaireDrawerHeader
          entry={entry}
          fr={fr}
          drawerTitleId={drawerTitleId}
          structureBadge={structureBadge}
          closeButtonRef={closeButtonRef}
          onClose={onClose}
        />
        <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-6">
          <AnnuaireDrawerOverviewSection
            entry={entry}
            fr={fr}
            associationProfile={associationProfile}
          />
          {associationProfile ? (
            <AnnuaireDrawerImpactSection
              entry={entry}
              fr={fr}
              associationProfile={associationProfile}
            />
          ) : null}
          {entry.contributionTypes.length > 0 || associationProfile ? (
            <AnnuaireDrawerNeedsSection
              entry={entry}
              fr={fr}
              associationProfile={associationProfile}
            />
          ) : null}
          <AnnuaireDrawerContactsSection
            entry={entry}
            fr={fr}
            isEditorial={isEditorial}
            publicDestination={publicDestination}
          />
          <AnnuaireDrawerSourcesSection
            entry={entry}
            fr={fr}
            associationProfile={associationProfile}
            structureContext={structureContext}
          />
          <AnnuaireDrawerRelationsSection entryId={entry.id} fr={fr} />
        </div>
        <AnnuaireDrawerFooter
          entry={entry}
          fr={fr}
          isEditorial={isEditorial}
          publicDestination={publicDestination}
          onClose={onClose}
        />
      </motion.div>
    </>
  );
}
