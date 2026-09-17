"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Calendar, MapPin, Users } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmDisclosure } from "@/components/ui/cmm-disclosure";
import { cn } from "@/lib/utils";
import { formatCleanupSupportLabel, formatCleanupWasteTypesLabel } from "@/lib/community/event-ops";
import { CommunityEventItem, CommunityRsvpStatus } from "@/lib/community/http";
import { formatFrDate, toRsvpLabel } from "./helpers";
import { ErrorMessage } from "@/components/ui/error-message";
import { PermissionErrorState } from "@/components/ui/permission-error-state";
import { ServerErrorCard } from "@/components/ui/server-error-card";
import { AppError } from "@/lib/errors/app-errors";
import type { CommunityTab, OpsDraft } from "./types";

// Helpers
export function cleanupNeedLabel(event: CommunityEventItem): string | null {
  if (!event.cleanupSupportLevel) {
    return null;
  }
  return `Besoin de bénévoles · ${formatCleanupSupportLabel(event.cleanupSupportLevel)}`;
}

// UI Components
export const EventTabsHeader = memo(function EventTabsHeader({
  activeTab,
  setActiveTab,
  locale,
}: {
  activeTab: CommunityTab;
  setActiveTab: (tab: CommunityTab) => void;
  locale: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-slate-950/40 border border-white/5 shadow-inner backdrop-blur-xl">
        <CmmButton
          onClick={() => setActiveTab("upcoming")}
          tone={activeTab === "upcoming" ? "primary" : "tertiary"}
          variant="pill"
          className={cn(
            "relative px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500",
            activeTab === "upcoming" ? "text-white" : "text-slate-500 hover:text-slate-300"
          )}
        >
          <span className="relative z-10">{locale === "fr" ? "À venir" : "Upcoming"}</span>
          {activeTab === "upcoming" && (
            <motion.div 
              layoutId="active-event-tab"
              className="absolute inset-0 bg-rose-600 rounded-xl shadow-xl shadow-rose-600/40"
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          )}
        </CmmButton>
        <CmmButton
          onClick={() => setActiveTab("mine")}
          tone={activeTab === "mine" ? "primary" : "tertiary"}
          variant="pill"
          className={cn(
            "relative px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500",
            activeTab === "mine" ? "text-white" : "text-slate-500 hover:text-slate-300"
          )}
        >
          <span className="relative z-10">{locale === "fr" ? "Mes inscriptions" : "My events"}</span>
          {activeTab === "mine" && (
            <motion.div 
              layoutId="active-event-tab"
              className="absolute inset-0 bg-pink-600 rounded-xl shadow-xl shadow-pink-600/40"
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          )}
        </CmmButton>
        <CmmButton
          onClick={() => setActiveTab("past")}
          tone={activeTab === "past" ? "primary" : "tertiary"}
          variant="pill"
          className={cn(
            "relative px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500",
            activeTab === "past" ? "text-white" : "text-slate-500 hover:text-slate-300"
          )}
        >
          <span className="relative z-10">{locale === "fr" ? "Passé" : "Past"}</span>
          {activeTab === "past" && (
            <motion.div 
              layoutId="active-event-tab"
              className="absolute inset-0 bg-slate-700 rounded-xl shadow-xl shadow-slate-900/40"
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          )}
        </CmmButton>
      </div>
    </div>
  );
});

export const EventListStates = memo(function EventListStates({
  eventsLoading,
  eventsLoadError,
  onRetry,
}: {
  eventsLoading: boolean;
  eventsLoadError: AppError | null;
  onRetry?: () => void;
}) {
  if (eventsLoading) {
    return (
      <p className="mt-3 cmm-text-small cmm-text-muted">
        Chargement agenda communautaire...
      </p>
    );
  }

  if (eventsLoadError) {
    if (eventsLoadError.kind === "permission") {
      return (
        <PermissionErrorState
          className="mt-3"
          title="Vous n'avez pas accès à l'agenda communautaire."
          message="Connectez-vous avec un compte autorisé pour consulter ou modifier les événements."
        />
      );
    }
    if (eventsLoadError.kind === "server") {
      return (
        <ServerErrorCard
          className="mt-3"
          title="Impossible de charger l'agenda communautaire."
          message={eventsLoadError.message}
          onRetry={onRetry}
        />
      );
    }
    return (
      <ErrorMessage
        className="mt-3"
        kind={eventsLoadError.kind}
        title="Connexion perdue"
        message={eventsLoadError.message}
        actions={onRetry ? <CmmButton type="button" onClick={onRetry} tone="primary" variant="pill" className="rounded-full px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700">Réessayer</CmmButton> : null}
      />
    );
  }

  return null;
});

export const EventArticleUpcoming = memo(function EventArticleUpcoming({
  event,
  locale,
  onRsvp,
  rsvpLoading,
  onShare,
}: {
  event: CommunityEventItem;
  locale: string;
  onRsvp: (eventId: string, status: CommunityRsvpStatus) => Promise<void>;
  rsvpLoading: boolean;
  onShare: (event: CommunityEventItem) => void;
}) {
  const fr = locale === "fr";
  const primaryRsvpLabel = rsvpLoading
    ? (fr ? "Traitement..." : "Processing...")
    : event.myRsvpStatus === "yes"
      ? (fr ? "✓ Je viens" : "✓ I'm coming")
      : (fr ? "Je viens" : "I'm coming");
  const secondaryRsvpLabel = fr ? "Je peux aider" : "Help";
  const relayLabel = fr ? "Je relaie" : "Relay";

  return (
    <article className="group relative overflow-hidden rounded-[3rem] border border-white/10 bg-slate-900/40 backdrop-blur-3xl p-8 shadow-2xl transition-all duration-500 hover:border-rose-500/30">
      <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
      
      <div className="relative flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between z-10">
        <div className="space-y-6 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-rose-400">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
              {fr ? "Mission active" : "Active mission"}
            </span>
          </div>

          <div>
            <h3 className="text-3xl font-black tracking-tight text-white leading-tight uppercase tracking-[0.05em]">
              {event.title}
            </h3>
            <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-2 text-[11px] font-black uppercase tracking-widest text-slate-500">
              <span className="flex items-center gap-2 text-slate-200">
                <Calendar size={14} className="text-rose-500" />
                {formatFrDate(event.eventDate)}
              </span>
              <span className="flex items-center gap-2">
                <MapPin size={14} className="text-rose-500" />
                {event.locationLabel}
              </span>
            </div>
          </div>

          <p className="max-w-2xl text-sm font-medium leading-relaxed text-slate-400 italic">
            &ldquo;{event.description || (fr ? "Pas de description détaillée." : "No detailed description.")}&rdquo;
          </p>

          <div className="flex flex-wrap gap-2">
            {event.cleanupObjective && (
              <span className="rounded-xl bg-white/5 border border-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-rose-400">
                Objectif: {event.cleanupObjective}
              </span>
            )}
            {event.cleanupZone && (
              <span className="rounded-xl bg-white/5 border border-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-pink-400">
                Zone: {event.cleanupZone}
              </span>
            )}
            {cleanupNeedLabel(event) && (
              <span className="rounded-xl bg-white/5 border border-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-amber-400">
                {cleanupNeedLabel(event)}
              </span>
            )}
            {event.cleanupLogisticsNeeds && (
              <span className="rounded-xl bg-white/5 border border-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-rose-400">
                Logistique: {event.cleanupLogisticsNeeds}
              </span>
            )}
            {event.cleanupWasteTypesExpected.length > 0 && (
              <span className="rounded-xl bg-white/5 border border-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-pink-400">
                Déchets attendus: {formatCleanupWasteTypesLabel(event.cleanupWasteTypesExpected)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 pt-4">
            <div className="flex -space-x-3">
              {[...Array(Math.min(5, event.rsvpCounts.yes))].map((_, i) => (
                <div key={i} className="h-10 w-10 rounded-2xl border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-white text-[10px] font-black shadow-2xl">
                   <Users size={12} className="opacity-40" />
                </div>
              ))}
              {event.rsvpCounts.yes > 5 && (
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border-2 border-slate-900 bg-slate-950 text-[10px] font-black text-rose-400 shadow-2xl">
                  +{event.rsvpCounts.yes - 5}
                </div>
              )}
            </div>
            <div className="space-y-0.5">
               <span className="text-xl font-black text-white block leading-none">{event.rsvpCounts.yes}</span>
               <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 block">
                 {fr ? "Participants confirmés" : "Confirmed participants"}
               </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:w-64 pt-8 lg:pt-0">
          <CmmButton
            onClick={() => void onRsvp(event.id, "yes")}
            disabled={rsvpLoading}
            tone={event.myRsvpStatus === "yes" ? "primary" : "secondary"}
            variant="pill"
            className={cn(
              "group/rsvp w-full rounded-2xl py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative overflow-hidden",
              event.myRsvpStatus === "yes" 
                ? "bg-rose-600 text-white shadow-2xl shadow-rose-600/40" 
                : "bg-white/5 border border-white/10 text-white hover:bg-rose-600 hover:border-rose-500"
            )}
          >
            <span className="relative z-10">{primaryRsvpLabel}</span>
            <motion.div className="absolute inset-0 bg-white/20 -translate-x-full group-hover/rsvp:translate-x-full transition-transform duration-1000" />
          </CmmButton>

          <div className="grid grid-cols-2 gap-3">
            <CmmButton
              onClick={() => void onRsvp(event.id, "maybe")}
              disabled={rsvpLoading}
              tone="secondary"
              variant="pill"
              className="rounded-xl py-3 text-[9px] font-black uppercase tracking-widest text-slate-300 hover:bg-white/10 transition-all"
            >
              {secondaryRsvpLabel}
            </CmmButton>
            <CmmButton
              onClick={() => void onRsvp(event.id, "no")}
              disabled={rsvpLoading}
              tone="tertiary"
              variant="pill"
              className="rounded-xl py-3 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:bg-rose-500/20 hover:text-rose-400 transition-all"
            >
              {fr ? "Décliner" : "Decline"}
            </CmmButton>
          </div>

          <div className="h-px bg-white/5 my-2" />

          <Link
            href={`/sections/messagerie?tab=discussions&channel=community&template=diffusion&topicId=demande_diffusion&eventId=${encodeURIComponent(event.id)}`}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/5 bg-white/5 py-3 text-[9px] font-black uppercase tracking-[0.15em] text-rose-400 hover:bg-rose-500/10 transition-all"
          >
            📣 {relayLabel}
          </Link>
          <Link
            href={`/actions/new?mode=complete&fromEventId=${event.id}`}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/5 bg-white/5 py-3 text-[9px] font-black uppercase tracking-[0.15em] text-pink-400 hover:bg-pink-500/10 transition-all"
          >
            🧾 {fr ? "Caractériser" : "Characterize"}
          </Link>
          <CmmButton
            onClick={() => onShare(event)}
            tone="tertiary"
            variant="pill"
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 hover:bg-white/10 transition-all"
          >
            🔗 {fr ? "QR Code" : "QR Code"}
          </CmmButton>
        </div>
      </div>
    </article>
  );
});

export const EventArticleMine = memo(function EventArticleMine({
  event,
}: {
  event: CommunityEventItem;
}) {
  return (
    <article className="rounded-3xl border border-white/10 bg-slate-900/20 backdrop-blur-xl p-6 transition-all hover:border-rose-500/30">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
        <h3 className="text-xl font-black text-white uppercase tracking-tight">{event.title}</h3>
        <span className="px-3 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[9px] font-black uppercase tracking-widest text-rose-400">
           {toRsvpLabel(event.myRsvpStatus ?? "no")}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-6 text-[10px] font-black uppercase tracking-widest text-slate-500">
        <span className="flex items-center gap-2 text-slate-300">
          <Calendar size={12} className="text-rose-500" />
          {formatFrDate(event.eventDate)}
        </span>
        <span className="flex items-center gap-2">
          <MapPin size={12} className="text-rose-500" />
          {event.locationLabel}
        </span>
      </div>
    </article>
  );
});

export const EventArticlePast = memo(function EventArticlePast({
  event,
  isUpdating,
  getOpsDraft,
  updateOpsDraft,
  onSaveEventOps,
}: {
  event: CommunityEventItem;
  isUpdating: boolean;
  getOpsDraft: (event: CommunityEventItem) => OpsDraft;
  updateOpsDraft: (eventId: string, patch: Partial<OpsDraft>) => void;
  onSaveEventOps: (event: CommunityEventItem) => Promise<void>;
}) {
  const { userId } = useAuth();
  const canEditOwnEvent = Boolean(userId && event.organizerClerkId === userId);
  const opsDraft = getOpsDraft(event);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-950">{event.title}</h3>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 cmm-text-small cmm-text-secondary">
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={14} aria-hidden="true" /> {formatFrDate(event.eventDate)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={14} aria-hidden="true" /> {event.locationLabel}
            </span>
          </div>
        </div>
        <span className="cmm-text-small cmm-text-secondary">
          {event.rsvpCounts.total} RSVP
        </span>
      </div>
      {canEditOwnEvent ? (
        <CmmDisclosure summary="Suivi de ma mission" tone="rose" size="sm" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)]">
            <label className="cmm-text-small font-semibold text-slate-700">
              Présence constatée
              <input
                type="number"
                min="0"
                step="1"
                value={opsDraft.attendanceCount}
                onChange={(inputEvent) => updateOpsDraft(event.id, { attendanceCount: inputEvent.target.value })}
                className="cmm-input mt-1 w-full"
              />
            </label>
            <label className="cmm-text-small font-semibold text-slate-700">
              Retour d&apos;expérience
              <textarea
                value={opsDraft.postMortem}
                onChange={(inputEvent) => updateOpsDraft(event.id, { postMortem: inputEvent.target.value })}
                className="cmm-input mt-1 min-h-28 w-full"
                rows={5}
              />
            </label>
          </div>
          <CmmButton
            type="button"
            className="mt-3"
            tone="primary"
            variant="pill"
            disabled={isUpdating}
            onClick={() => void onSaveEventOps(event)}
          >
            {isUpdating ? "Enregistrement…" : "Enregistrer le suivi"}
          </CmmButton>
        </CmmDisclosure>
      ) : null}
    </article>
  );
});
