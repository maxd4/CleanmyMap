"use client";

import { BarChart3, Calendar, MapPin, Megaphone, Plus, Trash2 } from "lucide-react";

import {
  COMMUNITY_ANNOUNCEMENT_TEMPLATES,
  type ChatRelatedEvent,
  type CommunityAnnouncementTemplateKey,
} from "@/lib/chat/announcements";
import { CHAT_POLL_MAX_OPTIONS, getChatPollOptionsValidationError } from "@/lib/chat/polls";
import { parseCivilDateAsUtc } from "@/lib/time/civil-date";

type ChatComposerModePanelProps = {
  isLight: boolean;
};

function ChatComposerPollPanel({
  isLight,
  pollOptions,
  pollOptionsError,
  onPollOptionsChange,
}: ChatComposerModePanelProps & {
  pollOptions: string[];
  pollOptionsError: string | null;
  onPollOptionsChange?: (options: string[]) => void;
}) {
  return (
    <div className={`mb-4 rounded-2xl border p-3 ${isLight ? "border-rose-100 bg-white/80" : "border-white/10 bg-white/5"}`}>
      <div className="mb-3 flex items-center gap-2">
        <BarChart3 size={15} className={isLight ? "text-rose-500" : "text-rose-300"} />
        <div>
          <p className={`text-xs font-black ${isLight ? "text-slate-800" : "text-white"}`}>
            Question du sondage
          </p>
          <p className="cmm-text-caption text-slate-500">
            Les votes sont enregistrés et affichés sous forme agrégée.
          </p>
        </div>
      </div>
      <div className="space-y-2">
        {pollOptions.map((option, index) => (
          <div key={`poll-option-${index}`} className="flex items-center gap-2">
            <span className="w-5 text-center text-xs font-black text-slate-400">{index + 1}</span>
            <input
              value={option}
              onChange={(event) => {
                const nextOptions = [...pollOptions];
                nextOptions[index] = event.target.value;
                onPollOptionsChange?.(nextOptions);
              }}
              maxLength={200}
              aria-label={`Option ${index + 1}`}
              placeholder={`Option ${index + 1}`}
              className={`min-w-0 flex-1 rounded-xl border px-3 py-2 text-xs outline-none ${isLight ? "border-rose-100 bg-white text-slate-900 focus:border-rose-300" : "border-white/10 bg-white/5 text-white focus:border-pink-400/50"}`}
            />
            <button
              type="button"
              onClick={() => onPollOptionsChange?.(pollOptions.filter((_, optionIndex) => optionIndex !== index))}
              disabled={pollOptions.length <= 2}
              aria-label={`Supprimer l'option ${index + 1}`}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onPollOptionsChange?.([...pollOptions, ""])}
          disabled={pollOptions.length >= CHAT_POLL_MAX_OPTIONS}
          className={`inline-flex items-center gap-1 rounded-xl border px-3 py-2 cmm-text-caption font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 disabled:cursor-not-allowed disabled:opacity-40 ${isLight ? "border-rose-100 text-rose-700 hover:bg-rose-50" : "border-white/10 text-slate-300 hover:bg-white/5"}`}
        >
          <Plus size={13} /> Ajouter une option
        </button>
        <span className="cmm-text-caption font-bold text-slate-400">{pollOptions.length}/{CHAT_POLL_MAX_OPTIONS}</span>
      </div>
      {pollOptionsError ? (
        <p className="mt-3 cmm-text-caption font-bold text-amber-600">{pollOptionsError}</p>
      ) : null}
    </div>
  );
}

function formatEventDate(value: string): string {
  const parsed = parseCivilDateAsUtc(value);
  return !parsed
    ? value
    : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone: "UTC" }).format(parsed);
}

function ChatComposerAnnouncementPanel({
  announcementEventError,
  announcementEventLoading,
  announcementEventRequested,
  announcementTemplate,
  isLight,
  onAnnouncementTemplateChange,
  relatedEvent,
}: ChatComposerModePanelProps & {
  announcementTemplate: CommunityAnnouncementTemplateKey | null;
  onAnnouncementTemplateChange?: (template: CommunityAnnouncementTemplateKey) => void;
  relatedEvent: ChatRelatedEvent | null;
  announcementEventRequested: boolean;
  announcementEventLoading: boolean;
  announcementEventError: Error | null;
}) {
  return (
    <div className={`mb-4 rounded-2xl border p-3 ${isLight ? "border-rose-100 bg-white/80" : "border-white/10 bg-white/5"}`}>
      <div className="mb-3 flex items-center gap-2">
        <Megaphone size={15} className={isLight ? "text-rose-500" : "text-rose-300"} />
        <div>
          <p className={`text-xs font-black ${isLight ? "text-slate-800" : "text-white"}`}>
            Choisissez un modèle de relais
          </p>
          <p className="cmm-text-caption text-slate-500">
            Le modèle prépare un brouillon éditable et son salon canonique.
          </p>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {COMMUNITY_ANNOUNCEMENT_TEMPLATES.map((template) => {
          const isActive = announcementTemplate === template.key;
          return (
            <button
              key={template.key}
              type="button"
              onClick={() => onAnnouncementTemplateChange?.(template.key)}
              aria-pressed={isActive}
              className={`rounded-xl border px-3 py-2 text-left transition ${
                isActive
                  ? isLight
                    ? "border-rose-300 bg-rose-50 text-rose-700"
                    : "border-rose-400/50 bg-rose-500/15 text-rose-200"
                  : isLight
                    ? "border-rose-100 bg-white text-slate-600 hover:bg-rose-50"
                    : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              <span className="block cmm-text-caption font-semibold">{template.label}</span>
              <span className="mt-1 block cmm-text-caption leading-tight text-slate-500">{template.description}</span>
            </button>
          );
        })}
      </div>
      {announcementTemplate ? null : (
        <p className="mt-3 cmm-text-caption font-bold text-amber-600">
          Sélectionnez un modèle avant de publier l&apos;annonce.
        </p>
      )}
      {announcementEventLoading ? (
        <p className="mt-3 cmm-text-caption font-bold text-slate-500">Chargement du cleanup associé…</p>
      ) : announcementEventError ? (
        <p className="mt-3 cmm-text-caption font-bold text-rose-600">
          Le cleanup associé n&apos;est plus disponible. L&apos;annonce ne peut pas être publiée avec ce lien.
        </p>
      ) : relatedEvent ? (
        <div className={`mt-3 rounded-xl border p-3 ${isLight ? "border-rose-100 bg-rose-50/60" : "border-rose-400/20 bg-rose-500/10"}`}>
          <p className="cmm-text-caption font-semibold text-rose-500">Cleanup associé</p>
          <p className={`mt-1 text-xs font-black ${isLight ? "text-slate-800" : "text-white"}`}>{relatedEvent.title}</p>
          <div className="mt-2 flex flex-wrap gap-3 cmm-text-caption font-bold text-slate-500">
            <span className="inline-flex items-center gap-1"><Calendar size={12} /> {formatEventDate(relatedEvent.event_date)}</span>
            <span className="inline-flex items-center gap-1"><MapPin size={12} /> {relatedEvent.location_label}</span>
          </div>
        </div>
      ) : announcementEventRequested ? (
        <p className="mt-3 cmm-text-caption font-bold text-rose-600">
          Le cleanup indiqué dans le lien est introuvable ou inaccessible.
        </p>
      ) : null}
    </div>
  );
}

export function ChatComposerModePanels({
  isLight,
  showModeTabs,
  composerModes,
  composerMode,
  pollOptions,
  onPollOptionsChange,
  announcementTemplate,
  onAnnouncementTemplateChange,
  relatedEvent,
  announcementEventRequested,
  announcementEventLoading,
  announcementEventError,
}: {
  isLight: boolean;
  showModeTabs: boolean;
  composerModes: readonly ("message" | "announcement" | "poll")[];
  composerMode: "message" | "announcement" | "poll";
  pollOptions: string[];
  onPollOptionsChange?: (options: string[]) => void;
  announcementTemplate: CommunityAnnouncementTemplateKey | null;
  onAnnouncementTemplateChange?: (template: CommunityAnnouncementTemplateKey) => void;
  relatedEvent: ChatRelatedEvent | null;
  announcementEventRequested: boolean;
  announcementEventLoading: boolean;
  announcementEventError: Error | null;
}) {
  if (!showModeTabs) return null;
  const canPoll = composerModes.includes("poll");
  const canAnnouncement = composerModes.includes("announcement");
  return <>
    {canPoll && composerMode === "poll" ? <ChatComposerPollPanel isLight={isLight} pollOptions={pollOptions} pollOptionsError={getChatPollOptionsValidationError(pollOptions)} onPollOptionsChange={onPollOptionsChange} /> : null}
    {canAnnouncement && composerMode === "announcement" ? <ChatComposerAnnouncementPanel isLight={isLight} announcementTemplate={announcementTemplate} onAnnouncementTemplateChange={onAnnouncementTemplateChange} relatedEvent={relatedEvent} announcementEventRequested={announcementEventRequested} announcementEventLoading={announcementEventLoading} announcementEventError={announcementEventError} /> : null}
  </>;
}
