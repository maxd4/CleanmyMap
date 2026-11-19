"use client";

import { AlertTriangle, ExternalLink, X } from "lucide-react";
import {
  PARIS_ACTOR_CATEGORY_META,
  PARIS_ECOSYSTEM_ROLE_LABELS,
  isSafeHttpUrl,
  sanitizeAndDeduplicatePublicChannels,
  type ParisCleanwalkActor,
  type PublicChannelType,
} from "@/lib/partners/paris-cleanwalk-network";

const ACTION_PARTICIPATION_TYPES = new Set<PublicChannelType>([
  "inscription_evenement",
  "plateforme_jagis",
  "plateforme_jeveuxaider",
  "plateforme_cleanwalk",
  "plateforme_helloasso",
]);

const COMMUNITY_TYPES = new Set<PublicChannelType>([
  "groupe_whatsapp",
  "groupe_discord",
  "reseau_facebook",
]);

export interface ParisNetwork3DBubbleProps {
  actor: ParisCleanwalkActor;
  isLocked: boolean;
  anchorPosition?: { leftPercent: number; topPercent: number } | null;
  onClose: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  fr: boolean;
}

export function ParisNetwork3DBubble({
  actor,
  isLocked,
  anchorPosition,
  onClose,
  onMouseEnter,
  onMouseLeave,
  fr,
}: ParisNetwork3DBubbleProps) {
  const safeChannels = sanitizeAndDeduplicatePublicChannels(actor.publicChannels);
  const participationLinks = safeChannels.filter((ch) =>
    ACTION_PARTICIPATION_TYPES.has(ch.type),
  );
  const communityLinks = safeChannels.filter((ch) =>
    COMMUNITY_TYPES.has(ch.type),
  );
  const safeSiteUrl = isSafeHttpUrl(actor.officialWebsite)
    ? actor.officialWebsite
    : null;
  const otherChannels = safeChannels.filter(
    (ch) =>
      !ACTION_PARTICIPATION_TYPES.has(ch.type) &&
      !COMMUNITY_TYPES.has(ch.type) &&
      ch.url !== safeSiteUrl,
  );

  const roleLabels = actor.ecosystemRoles
    .map((role) => PARIS_ECOSYSTEM_ROLE_LABELS[role])
    .join(" · ");

  const positioningStyle = anchorPosition
    ? {
        left: `${Math.min(Math.max(anchorPosition.leftPercent, 6), 64)}%`,
        top: `${Math.min(Math.max(anchorPosition.topPercent, 6), 54)}%`,
      }
    : undefined;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={fr ? `Informations sur ${actor.name}` : `Information about ${actor.name}`}
      style={positioningStyle}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`${
        anchorPosition
          ? "absolute z-30 w-[min(21rem,calc(100%-1.5rem))]"
          : "relative z-30 w-full max-w-md"
      } max-h-[82%] overflow-y-auto rounded-2xl border border-violet-300/35 bg-slate-950/95 p-4 text-xs text-slate-200 shadow-2xl backdrop-blur-xl`}
    >
      {/* 1. Nom et rôle réel */}
      <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-2.5">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wider text-violet-300">
            {roleLabels} · {PARIS_ACTOR_CATEGORY_META[actor.category].shortLabel}
          </p>
          <h3 className="mt-0.5 text-base font-black tracking-tight text-white">
            {actor.name}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={fr ? `Fermer la bulle de ${actor.name}` : `Close ${actor.name} bubble`}
          className="rounded-lg border border-white/10 bg-white/5 p-1 text-slate-300 transition-colors hover:bg-white/15 hover:text-white focus:outline-none focus:ring-2 focus:ring-violet-400"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>

      <div className="mt-2.5 space-y-2.5">
        {/* 2. Responsable ou référent public, si connu */}
        {actor.publicLeader ? (
          <p className="text-slate-200">
            <span className="font-bold text-slate-400">
              {fr ? "Référent public :" : "Public referent:"}{" "}
            </span>
            <span className="font-semibold text-white">
              {actor.publicLeader.name}
            </span>{" "}
            ({actor.publicLeader.roleTitle})
          </p>
        ) : null}

        {/* 3. Description très courte de l'activité */}
        {actor.activities[0] ? (
          <p className="leading-relaxed text-slate-300">{actor.activities[0]}</p>
        ) : null}

        {actor.platformStatus?.v2UnavailableFeaturesNote ? (
          <div className="flex items-start gap-1.5 rounded-lg border border-amber-400/30 bg-amber-500/10 p-2 text-xs text-amber-100">
            <AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-300" aria-hidden="true" />
            <span>{actor.platformStatus.v2UnavailableFeaturesNote}</span>
          </div>
        ) : null}

        {/* 4. Participer aux actions */}
        {participationLinks.length > 0 ? (
          <div>
            <p className="font-black uppercase tracking-wider text-xs text-sky-300">
              {fr ? "Participer aux actions" : "Join actions"}
            </p>
            <ul className="mt-1 space-y-1">
              {participationLinks.map((ch) => (
                <li key={ch.url}>
                  <a
                    href={ch.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-sky-200 underline decoration-sky-400/50 underline-offset-2 hover:text-white"
                  >
                    <span>{ch.label}</span>
                    <ExternalLink size={11} aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* 5. Rejoindre la communauté */}
        {communityLinks.length > 0 ? (
          <div>
            <p className="font-black uppercase tracking-wider text-xs text-violet-300">
              {fr ? "Rejoindre la communauté" : "Join community"}
            </p>
            <ul className="mt-1 space-y-1">
              {communityLinks.map((ch) => (
                <li key={ch.url}>
                  <a
                    href={ch.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-violet-200 underline decoration-violet-400/50 underline-offset-2 hover:text-white"
                  >
                    <span>{ch.label}</span>
                    <ExternalLink size={11} aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* 6. Site web officiel et autres canaux publics pertinents */}
        {safeSiteUrl || otherChannels.length > 0 ? (
          <div>
            <p className="font-black uppercase tracking-wider text-xs text-slate-300">
              {fr ? "Site officiel & canaux publics" : "Official site & public channels"}
            </p>
            <ul className="mt-1 space-y-1">
              {safeSiteUrl ? (
                <li>
                  <a
                    href={safeSiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-white underline decoration-violet-400/50 underline-offset-2 hover:text-violet-200"
                  >
                    <span>{fr ? "Site web officiel" : "Official website"}</span>
                    <ExternalLink size={11} aria-hidden="true" />
                  </a>
                </li>
              ) : null}
              {otherChannels.map((ch) => (
                <li key={ch.url}>
                  <a
                    href={ch.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-slate-200 underline decoration-white/30 underline-offset-2 hover:text-white"
                  >
                    <span>{ch.label}</span>
                    <ExternalLink size={11} aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* 7. Source et fraîcheur */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2 text-xs text-slate-300">
          <span>
            {isSafeHttpUrl(actor.provenance.sourceUrl) ? (
              <a
                href={actor.provenance.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-slate-200"
              >
                Source : {actor.provenance.sourceLabel}
              </a>
            ) : (
              `Source : ${actor.provenance.sourceLabel}`
            )}
          </span>
          <span>
            {fr ? "Vérifié :" : "Verified:"} {actor.verifiedAt}
            {isLocked ? (fr ? " · Épinglé" : " · Pinned") : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
