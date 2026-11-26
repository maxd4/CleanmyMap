"use client";

import type { RefObject } from "react";
import { motion } from "framer-motion";
import {
  X,
  Building2,
  Sparkles,
  MessageSquare,
} from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import type { EnrichedAnnuaireEntry } from "./annuaire-helpers";
import {
  ENTITY_LABELS,
  getAnnuairePublicDestination,
  isEditorialAnnuaireEntry,
} from "./annuaire-helpers";
import { getAssociationStructureBadge } from "./annuaire-association-profile";
import { cn } from "@/lib/utils";
import { projectPublicEntity } from "@/lib/partners/public-entity-projection";
import { PublicEntityDetails } from "./public-entity-details";
import { PublicDirectoryDetails } from "./public-directory-details";

type DrawerCommonProps = { entry: EnrichedAnnuaireEntry; fr: boolean };

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
  const structureBadge = getAssociationStructureBadge(entry);
  const isEditorial = isEditorialAnnuaireEntry(entry);
  const publicDestination = getAnnuairePublicDestination(entry);
  const projection = projectPublicEntity({ annuaireEntryId: entry.id }, entry.provenance === "published_partner" ? entry : undefined);

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
          {projection ? <PublicEntityDetails projection={projection} fr={fr} /> : <PublicDirectoryDetails entry={entry} fr={fr} /> }
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
