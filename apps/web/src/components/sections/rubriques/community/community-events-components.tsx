"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Calendar, MapPin, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCleanupSupportLabel } from "@/lib/community/event-ops";
import { CommunityEventItem, CommunityRsvpStatus } from "@/lib/community/http";
import { formatFrDate, toRsvpLabel } from "./helpers";
import { formatPct } from "./kpis";
import { ErrorMessage } from "@/components/ui/error-message";
import { PermissionErrorState } from "@/components/ui/permission-error-state";
import { ServerErrorCard } from "@/components/ui/server-error-card";
import { IdentityBadge } from "@/components/ui/identity-badge";
import { AppError } from "@/lib/errors/app-errors";
import { EventReminder, EventConversionRow } from "@/lib/community/engagement";
import { CommunityTab, OpsDraft } from "./types";

// Helpers
export function organizerView(event: CommunityEventItem) {
  return (
    event.organizer ?? {
      userId: event.organizerClerkId ?? null,
      displayName: "Membre",
      roleBadge: { id: "role_benevole", label: "Bénévole", icon: "RBV" },
      profileBadge: { id: "profile_benevole", label: "Profil bénévole", icon: "PBV" },
    }
  );
}

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
        <button
          onClick={() => setActiveTab("upcoming")}
          className={cn(
            "relative px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500",
            activeTab === "upcoming" ? "text-white" : "text-slate-500 hover:text-slate-300"
          )}
        >
          <span className="relative z-10">{locale === "fr" ? "À venir" : "Upcoming"}</span>
          {activeTab === "upcoming" && (
            <motion.div 
              layoutId="active-event-tab"
              className="absolute inset-0 bg-emerald-600 rounded-xl shadow-xl shadow-emerald-600/40"
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          )}
        </button>
        <button
          onClick={() => setActiveTab("mine")}
          className={cn(
            "relative px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500",
            activeTab === "mine" ? "text-white" : "text-slate-500 hover:text-slate-300"
          )}
        >
          <span className="relative z-10">{locale === "fr" ? "Mes inscriptions" : "My events"}</span>
          {activeTab === "mine" && (
            <motion.div 
              layoutId="active-event-tab"
              className="absolute inset-0 bg-indigo-600 rounded-xl shadow-xl shadow-indigo-600/40"
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          )}
        </button>
        <button
          onClick={() => setActiveTab("past")}
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
        </button>
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
        actions={onRetry ? <button type="button" onClick={onRetry} className="rounded-full bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-700">Réessayer</button> : null}
      />
    );
  }

  return null;
});

export const EventArticleUpcoming = memo(function EventArticleUpcoming({
  event,
  reminder,
  locale,
  onRsvp,
  rsvpLoading,
  onShare,
}: {
  event: CommunityEventItem;
  reminder?: EventReminder;
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
    <article className="group relative overflow-hidden rounded-[3rem] border border-white/10 bg-slate-900/40 backdrop-blur-3xl p-8 shadow-2xl transition-all duration-500 hover:border-emerald-500/30">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
      
      <div className="relative flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between z-10">
        <div className="space-y-6 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {fr ? "Mission active" : "Active mission"}
            </span>
            {reminder && (
              <span className="inline-flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-amber-400">
                {reminder.reason}
              </span>
            )}
          </div>

          <div>
            <h3 className="text-3xl font-black tracking-tight text-white leading-tight uppercase tracking-[0.05em]">
              {event.title}
            </h3>
            <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-2 text-[11px] font-black uppercase tracking-widest text-slate-500">
              <span className="flex items-center gap-2 text-slate-200">
                <Calendar size={14} className="text-emerald-500" />
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
              <span className="rounded-xl bg-white/5 border border-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-sky-400">
                Objectif: {event.cleanupObjective}
              </span>
            )}
            {event.cleanupZone && (
              <span className="rounded-xl bg-white/5 border border-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-violet-400">
                Zone: {event.cleanupZone}
              </span>
            )}
            {cleanupNeedLabel(event) && (
              <span className="rounded-xl bg-white/5 border border-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-amber-400">
                {cleanupNeedLabel(event)}
              </span>
            )}
            {event.cleanupLogisticsNeeds && (
              <span className="rounded-xl bg-white/5 border border-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-400">
                Logistique: {event.cleanupLogisticsNeeds}
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
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border-2 border-slate-900 bg-slate-950 text-[10px] font-black text-emerald-400 shadow-2xl">
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
          <button
            onClick={() => void onRsvp(event.id, "yes")}
            disabled={rsvpLoading}
            className={cn(
              "group/rsvp w-full rounded-2xl py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative overflow-hidden",
              event.myRsvpStatus === "yes" 
                ? "bg-emerald-600 text-white shadow-2xl shadow-emerald-600/40" 
                : "bg-white/5 border border-white/10 text-white hover:bg-emerald-600 hover:border-emerald-500"
            )}
          >
            <span className="relative z-10">{primaryRsvpLabel}</span>
            <motion.div className="absolute inset-0 bg-white/20 -translate-x-full group-hover/rsvp:translate-x-full transition-transform duration-1000" />
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => void onRsvp(event.id, "maybe")}
              disabled={rsvpLoading}
              className="rounded-xl border border-white/10 bg-white/5 py-3 text-[9px] font-black uppercase tracking-widest text-slate-300 hover:bg-white/10 transition-all"
            >
              {secondaryRsvpLabel}
            </button>
            <button
              onClick={() => void onRsvp(event.id, "no")}
              disabled={rsvpLoading}
              className="rounded-xl border border-white/10 bg-white/5 py-3 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:bg-rose-500/20 hover:text-rose-400 transition-all"
            >
              {fr ? "Décliner" : "Decline"}
            </button>
          </div>

          <div className="h-px bg-white/5 my-2" />

          <Link
            href="#messagerie"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/5 bg-white/5 py-3 text-[9px] font-black uppercase tracking-[0.15em] text-emerald-400 hover:bg-emerald-500/10 transition-all"
          >
            📣 {relayLabel}
          </Link>
          <Link
            href={`/actions/new?mode=complete&fromEventId=${event.id}`}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/5 bg-white/5 py-3 text-[9px] font-black uppercase tracking-[0.15em] text-sky-400 hover:bg-sky-500/10 transition-all"
          >
            🧾 {fr ? "Caractériser" : "Characterize"}
          </Link>
          <button 
            onClick={() => onShare(event)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/5 bg-white/5 py-3 text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 hover:bg-white/10 transition-all"
          >
            🔗 {fr ? "QR Code" : "QR Code"}
          </button>
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
    <article className="rounded-3xl border border-white/10 bg-slate-900/20 backdrop-blur-xl p-6 transition-all hover:border-indigo-500/30">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
        <h3 className="text-xl font-black text-white uppercase tracking-tight">{event.title}</h3>
        <span className="px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-black uppercase tracking-widest text-indigo-400">
           {toRsvpLabel(event.myRsvpStatus ?? "none")}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-6 text-[10px] font-black uppercase tracking-widest text-slate-500">
        <span className="flex items-center gap-2 text-slate-300">
          <Calendar size={12} className="text-indigo-500" />
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
  conversion,
  opsDraft,
  updateOpsDraft,
  onSaveEventOps,
  isUpdating,
}: {
  event: CommunityEventItem;
  conversion?: EventConversionRow;
  opsDraft: OpsDraft;
  updateOpsDraft: (eventId: string, patch: Partial<OpsDraft>) => void;
  onSaveEventOps: (event: CommunityEventItem) => Promise<void>;
  isUpdating: boolean;
}) {
  const organizer = organizerView(event);

  return (
    <article className="group relative overflow-hidden rounded-[3rem] border border-white/10 bg-slate-900/40 backdrop-blur-3xl p-8 shadow-2xl transition-all duration-500 hover:border-slate-500/30">
      <div className="relative z-10">
        <div className="flex flex-col lg:flex-row items-start justify-between gap-8">
          <div className="space-y-6 flex-1">
            <div className="flex flex-wrap items-center gap-4">
              <h3 className="text-2xl font-black text-white uppercase tracking-tight">{event.title}</h3>
              <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-white/5 border border-white/5 text-[9px] font-black uppercase tracking-widest text-slate-500">
                {formatFrDate(event.eventDate)}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
               <div className="space-y-1">
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-600 block">RSVP TOTAL</span>
                  <span className="text-lg font-black text-white">{event.rsvpCounts.total}</span>
               </div>
               <div className="space-y-1">
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-600 block">CONV. PRÉSENCE</span>
                  <span className="text-lg font-black text-emerald-400">{formatPct(conversion?.rsvpToAttendanceRate ?? null)}</span>
               </div>
               <div className="space-y-1">
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-600 block">CONV. ACTION</span>
                  <span className="text-lg font-black text-sky-400">{formatPct(conversion?.attendanceToActionRate ?? null)}</span>
               </div>
               <div className="space-y-1">
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-600 block">LOCALISATION</span>
                  <span className="text-[10px] font-bold text-slate-400 block truncate">{event.locationLabel}</span>
               </div>
            </div>

            <div className="p-6 rounded-[2rem] bg-white/5 border border-white/5 space-y-4">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-black text-white">
                       {organizer.displayName[0]}
                    </div>
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{organizer.displayName}</span>
                  </div>
                  <div className="flex gap-2">
                    <IdentityBadge icon={organizer.roleBadge.icon} label={organizer.roleBadge.label} tone="role" />
                    <IdentityBadge icon={organizer.profileBadge.icon} label={organizer.profileBadge.label} tone="profile" />
                  </div>
               </div>
            </div>
          </div>

          <div className="w-full lg:w-80 space-y-6 pt-8 lg:pt-0 lg:pl-8 lg:border-l lg:border-white/5">
            <div className="space-y-4">
              <label className="flex flex-col gap-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Présence constatée</span>
                <input
                  type="number"
                  min={0}
                  value={opsDraft.attendanceCount}
                  onChange={(input) => updateOpsDraft(event.id, { attendanceCount: input.target.value })}
                  className="w-full rounded-xl bg-slate-950/40 border border-white/10 px-4 py-2.5 text-sm text-white focus:border-emerald-500/50 outline-none transition-all"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Rapport post-événement</span>
                <textarea
                  rows={4}
                  value={opsDraft.postMortem}
                  onChange={(input) => updateOpsDraft(event.id, { postMortem: input.target.value })}
                  placeholder="Points forts, défis, besoins..."
                  className="w-full rounded-xl bg-slate-950/40 border border-white/10 px-4 py-2.5 text-sm text-white focus:border-emerald-500/50 outline-none transition-all resize-none"
                />
              </label>
            </div>

            <button
              onClick={() => void onSaveEventOps(event)}
              disabled={isUpdating}
              className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:bg-emerald-600 hover:text-white hover:border-emerald-500 transition-all disabled:opacity-50"
            >
              {isUpdating ? "Synchronisation..." : "Enregistrer le suivi"}
            </button>

            <Link
              href={`/actions/new?mode=complete&fromEventId=${event.id}`}
              className="flex w-full items-center justify-center gap-2 py-4 rounded-2xl bg-sky-600 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-sky-600/20 hover:bg-sky-500 transition-all"
            >
              Déclarer une action
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
});
