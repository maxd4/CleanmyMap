"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Info,
  Hash,
  Mail,
  MapPin,
  MessageSquare,
  Shield,
  Users,
} from "lucide-react";
import { useSearchParams } from "next/navigation";

import { ChatShell } from "@/components/chat/chat-shell";
import { getDiscussionGuidance } from "@/components/chat/discussion-guidance";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { isChatChannelType, type ChatChannelType } from "@/lib/chat/channels";
import type { ChatUser } from "@/components/chat/chat-types";
import { DiscussionBadgesPanel } from "./discussion-badges-panel";

type ConnectTab = "discussions" | "dm";
type CommunityAnnouncementTemplateKey =
  | "relais_associatif"
  | "benevoles"
  | "diffusion";

const CHANNEL_STATS = [
  { label: { fr: "Communauté", en: "Community" }, icon: Users, count: "Public", color: "text-emerald-600" },
  { label: { fr: "Privé", en: "Private" }, icon: Mail, count: "1:1", color: "text-sky-600" },
  { label: { fr: "Admin & élus", en: "Admin & elected" }, icon: Shield, count: "Réservé", color: "text-violet-600" },
  { label: { fr: "Territoire", en: "Territory" }, icon: MapPin, count: "Local", color: "text-amber-600" },
  { label: { fr: "Feedback", en: "Feedback" }, icon: MessageSquare, count: "Direct", color: "text-rose-600" },
];

export function ConnectSection({ defaultTab = "discussions" }: { defaultTab?: ConnectTab }) {
  const [activeTab, setActiveTab] = useState<ConnectTab>(defaultTab);
  const searchParams = useSearchParams();
  const { locale } = useSitePreferences();
  const fr = locale === "fr";

  const requestedTab = searchParams.get("tab");
  const requestedChannel = searchParams.get("channel");
  const requestedRecipientId = searchParams.get("recipientId");
  const requestedRecipientLabel = searchParams.get("recipientLabel");
  const requestedRecipientHandle = searchParams.get("recipientHandle");
  const requestedZoneName = searchParams.get("zoneName");
  const requestedArrondissement = Number.parseInt(searchParams.get("arrondissementId") ?? "", 10);
  const requestedTemplate = searchParams.get("template");
  const requestedEventId = searchParams.get("eventId");

  const initialChannelType: ChatChannelType = isChatChannelType(requestedChannel)
    ? requestedChannel
    : defaultTab === "dm" || requestedTab === "dm"
      ? "dm"
      : "community";

  const initialRecipient: ChatUser | null =
    initialChannelType === "dm" && requestedRecipientId
      ? {
          id: requestedRecipientId,
          display_name: requestedRecipientLabel?.trim() || requestedRecipientHandle?.trim() || "Membre",
          handle: requestedRecipientHandle?.trim() || requestedRecipientId.slice(0, 8),
          avatar_url: null,
        }
      : null;

  const initialTab: ConnectTab =
    requestedTab === "dm" || initialChannelType === "dm" || defaultTab === "dm"
      ? "dm"
      : "discussions";

  const initialArrondissement = Number.isInteger(requestedArrondissement)
    ? requestedArrondissement
    : 11;
  const initialZoneName = requestedZoneName?.trim().length ? requestedZoneName.trim() : null;
  const initialAnnouncementTemplate =
    requestedTemplate === "relais_associatif" ||
    requestedTemplate === "benevoles" ||
    requestedTemplate === "diffusion"
      ? requestedTemplate
      : null;
  const [announcementTemplate, setAnnouncementTemplate] = useState<CommunityAnnouncementTemplateKey | null>(
    initialAnnouncementTemplate,
  );

  function buildAnnouncementTemplate(
    template: CommunityAnnouncementTemplateKey | null,
  ): string {
    if (!template) {
      return "";
    }
    const eventSuffix = requestedEventId?.trim().length
      ? `\nCleanup associé: ${requestedEventId.trim()}`
      : "";
    if (template === "relais_associatif") {
      return `Besoin de relais associatif\nContexte: je cherche une association pour relayer un cleanup.${eventSuffix}\nAction attendue: diffusion et prise de contact.`;
    }
    if (template === "benevoles") {
      return `Besoin de bénévoles\nContexte: je coordonne un cleanup et j'ai besoin de renfort sur le terrain.${eventSuffix}\nAction attendue: mobilisation de volontaires.`;
    }
    return `Besoin de diffusion\nContexte: je veux relayer un cleanup auprès d'un réseau plus large.${eventSuffix}\nAction attendue: partage du message et relais local.`;
  }

  const communityInitialMessage = buildAnnouncementTemplate(
    announcementTemplate,
  );
  const communityAnnouncementKey =
    announcementTemplate ?? "none";

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const tabs = useMemo(
    () => [
      {
        id: "discussions" as const,
        label: { fr: "Canaux", en: "Channels" },
        icon: Hash,
        desc: {
          fr: "Communauté, privé, élus, territoire et feedback",
          en: "Community, private, elected, territory and feedback",
        },
      },
      {
        id: "dm" as const,
        label: { fr: "Messages privés", en: "Private messages" },
        icon: Mail,
        desc: {
          fr: "Conversation directe et confidentielle",
          en: "Direct and confidential conversation",
        },
      },
    ],
    [],
  );

  const currentTabGuide = activeTab === "dm"
    ? getDiscussionGuidance("dm", { locale })
    : getDiscussionGuidance("community", { locale });
  const discussionShellKey = `discussions:${initialChannelType}:${initialRecipient?.id ?? "none"}:${initialArrondissement}:${initialZoneName ?? "no-zone"}:${communityAnnouncementKey}`;
  const dmShellKey = `dm:${initialRecipient?.id ?? "none"}:${initialArrondissement}:${initialZoneName ?? "no-zone"}`;

  return (
    <section className="space-y-6">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-[linear-gradient(180deg,rgba(71,22,46,0.98),rgba(42,12,29,0.98))] px-6 py-14 text-white shadow-2xl md:px-10 lg:py-20">
        <div className="absolute inset-0 bg-gradient-to-br from-[#7a1f49] via-[#a21caf] to-[#c0266b] opacity-70" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_70%_-10%,rgba(236,72,153,0.22),transparent),radial-gradient(ellipse_40%_40%_at_0%_100%,rgba(244,114,182,0.18),transparent)]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />

        <div className="relative z-10 mx-auto max-w-5xl space-y-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-2xl border border-pink-200/16 bg-pink-500/[0.08] px-5 py-2.5 backdrop-blur-md">
            <div className="flex items-center gap-2 rounded-xl border border-pink-200/18 bg-pink-500/15 px-4 py-1.5 text-pink-200">
              <MessageSquare size={14} />
              <span className="cmm-text-caption font-bold uppercase tracking-[0.25em]">
                {fr ? "Échanges" : "Connect"}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl font-bold leading-[0.95] tracking-tighter sm:text-5xl md:text-6xl">
              {fr ? (
                <>
                  Parlez au bon endroit,
                  <br />
                  dès le premier message.
                </>
              ) : (
                <>
                  Speak in the right place,
                  <br />
                  from the first message.
                </>
              )}
            </h1>
            <p className="mx-auto max-w-2xl text-base font-light leading-relaxed text-white/70 sm:text-lg">
              {fr
                ? "Choisissez le canal, voyez qui lit le message, puis lancez la conversation sans page vide ni ambiguïté."
                : "Choose the right channel, see who reads it, and start the conversation without friction or ambiguity."}
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {[
              {
                title: fr ? "Publier en communauté" : "Post to community",
                text: fr
                  ? "Pour une question ouverte, un point terrain ou une coordination visible."
                  : "For an open question, a field note or visible coordination.",
              },
              {
                title: fr ? "Écrire en privé" : "Write privately",
                text: fr
                  ? "Pour un échange direct avec un membre, sans exposer le sujet au groupe."
                  : "For direct exchange with one member, without exposing the topic to the group.",
              },
              {
                title: fr ? "Ancrer un sujet local" : "Anchor a local topic",
                text: fr
                  ? "Pour une rue, un quartier ou un arrondissement précis."
                  : "For a street, neighborhood or specific district.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-[1.75rem] border border-pink-200/14 bg-[rgba(255,255,255,0.05)] p-4 text-left backdrop-blur-md"
              >
                <p className="text-sm font-black uppercase tracking-[0.14em] text-white">
                  {item.title}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-white/70">{item.text}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {CHANNEL_STATS.map((stat) => (
              <div
                key={stat.label.fr}
                className="inline-flex items-center gap-2 rounded-full border border-pink-200/14 bg-[rgba(255,255,255,0.05)] px-4 py-2 backdrop-blur-sm"
              >
                <stat.icon size={14} className={stat.color} />
                <span className="cmm-text-caption font-semibold text-white/80">
                  {fr ? stat.label.fr : stat.label.en}
                </span>
                <span className={`cmm-text-caption font-bold ${stat.color}`}>
                  {stat.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="relative z-20 mx-auto max-w-5xl -mt-8 px-4">
        <div className="rounded-[2rem] border border-pink-100/40 bg-[rgba(255,248,251,0.96)] p-2 shadow-xl shadow-pink-950/5 backdrop-blur-xl dark:border-pink-900/40 dark:bg-slate-900/95">
          <div className="flex gap-2">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={[
                    "flex flex-1 items-center justify-center gap-3 rounded-[1.5rem] px-5 py-4 transition-all duration-300 group",
                    isActive
                      ? "bg-gradient-to-br from-pink-600 to-fuchsia-600 text-white shadow-lg shadow-pink-500/20"
                      : "text-slate-500 hover:bg-pink-50 hover:text-pink-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200",
                  ].join(" ")}
                >
                  <tab.icon
                    size={18}
                    className={isActive ? "text-white" : "text-slate-400 group-hover:text-pink-500"}
                  />
                  <div className="text-left">
                    <span className="cmm-text-small block font-bold">
                      {fr ? tab.label.fr : tab.label.en}
                    </span>
                    <span
                      className={[
                        "hidden cmm-text-caption sm:block",
                        isActive ? "text-white/70" : "text-slate-400",
                      ].join(" ")}
                    >
                      {fr ? tab.desc.fr : tab.desc.en}
                    </span>
                  </div>
                  {isActive ? (
                    <span className="relative ml-auto flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pink-300 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-pink-50" />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-4 px-4">
        {activeTab === "discussions" ? (
          <div className="space-y-4">
            <div className="rounded-[1.75rem] border border-pink-100/40 bg-[rgba(255,248,251,0.96)] p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-pink-100 text-pink-600 dark:bg-pink-500/15 dark:text-pink-200">
                  <Info size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-pink-600">
                    {fr ? "Info" : "Info"}
                  </p>
                  <p className="mt-2 text-sm font-semibold cmm-text-primary">
                    {fr
                      ? "Choisissez un canal puis envoyez un message court. Communauté pour le groupe, privé pour un échange direct, territoire pour le local, feedback pour le produit."
                      : "Choose one channel, then send a short message. Community for the group, private for one-to-one, territory for local topics, feedback for the product."}
                  </p>
                  <p className="mt-2 text-xs cmm-text-secondary">
                    {fr
                      ? "Un seul repère suffit ici: le bon canal et le bon destinataire."
                      : "One cue is enough here: the right channel and the right recipient."}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-[1.75rem] border border-pink-100/40 bg-white/95 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-pink-600">
                    {fr ? "Annonce spontanée" : "Spontaneous announcement"}
                  </p>
                  <h3 className="mt-1 text-base font-black text-slate-900 dark:text-white">
                    {fr ? "Préparer un message de relais" : "Prepare a relay message"}
                  </h3>
                </div>
                {announcementTemplate ? (
                  <button
                    type="button"
                    onClick={() => setAnnouncementTemplate(null)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-500 hover:bg-slate-50"
                  >
                    {fr ? "Effacer" : "Clear"}
                  </button>
                ) : null}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  {
                    key: "relais_associatif" as const,
                    label: fr ? "Besoin de relais associatif" : "Need association relay",
                  },
                  {
                    key: "benevoles" as const,
                    label: fr ? "Besoin de bénévoles" : "Need volunteers",
                  },
                  {
                    key: "diffusion" as const,
                    label: fr ? "Besoin de diffusion" : "Need diffusion",
                  },
                ].map((option) => {
                  const isActive = announcementTemplate === option.key;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setAnnouncementTemplate(option.key)}
                      className={[
                        "rounded-full px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] transition",
                        isActive
                          ? "bg-pink-600 text-white shadow-lg shadow-pink-200"
                          : "border border-pink-100 bg-pink-50/70 text-pink-700 hover:bg-pink-100",
                      ].join(" ")}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              {communityInitialMessage ? (
                <p className="mt-3 rounded-2xl border border-pink-100 bg-pink-50/70 p-3 text-sm leading-relaxed text-slate-700">
                  {communityInitialMessage}
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <article className="rounded-[2rem] border border-pink-100/40 bg-[rgba(255,248,251,0.96)] p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-pink-100 text-pink-600 dark:bg-pink-500/15 dark:text-pink-200">
                <Info size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-pink-600">
                  {currentTabGuide.cardTitle}
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight cmm-text-primary">
                  {fr
                    ? "Échange direct et confidentiel"
                    : "Direct and confidential exchange"}
                </h2>
                <p className="mt-2 text-sm cmm-text-secondary">
                  {currentTabGuide.cardSummary}
                </p>
                <p className="mt-2 text-xs cmm-text-secondary">
                  {currentTabGuide.visibilityLabel}
                </p>
              </div>
            </div>
          </article>
        )}
      </div>

      <div className="mx-auto max-w-5xl">
        {activeTab === "discussions" ? (
          <div className="space-y-5 animate-in fade-in duration-300">
            <DiscussionBadgesPanel />
            <ChatShell
              key={discussionShellKey}
              initialChannelType={initialChannelType}
              initialArrondissement={initialArrondissement}
              initialZoneName={initialZoneName}
              initialRecipient={initialRecipient}
              initialMessage={communityInitialMessage}
            />
          </div>
        ) : (
          <div className="animate-in fade-in duration-300">
            <ChatShell
              key={dmShellKey}
              initialChannelType="dm"
              initialArrondissement={initialArrondissement}
              initialZoneName={initialZoneName}
              initialRecipient={initialRecipient}
            />
          </div>
        )}
      </div>
    </section>
  );
}
