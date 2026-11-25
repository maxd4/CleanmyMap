"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { AlertTriangle, ExternalLink, X } from "lucide-react";
import {
  PARIS_ACTOR_CATEGORY_META,
  PARIS_ECOSYSTEM_ROLE_LABELS,
  isSafeHttpUrl,
  sanitizeAndDeduplicatePublicChannels,
  type ParisCleanwalkActor,
  type PublicChannelType,
} from "@/lib/partners/paris-cleanwalk-network";
import {
  getParisAssociationContact,
  PARIS_DPE_CONTACT,
  PARIS_MUNICIPAL_TOWN_HALLS,
  resolveParisCleaningDivisionContacts,
} from "@/lib/partners/paris-cleanwalk-network.contacts";

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

export function computeClampedBubblePosition(params: {
  anchorPosition: { leftPercent: number; topPercent: number };
  containerWidth: number;
  containerHeight: number;
  bubbleWidth: number;
  bubbleHeight: number;
  marginPx?: number;
}): { leftPx: number; topPx: number; maxHeightPx: number } {
  const margin = params.marginPx ?? 12;
  const { containerWidth, containerHeight, bubbleWidth, bubbleHeight } = params;

  const desiredLeft = (params.anchorPosition.leftPercent / 100) * containerWidth;
  const desiredTop = (params.anchorPosition.topPercent / 100) * containerHeight;

  const maxLeft = Math.max(margin, containerWidth - bubbleWidth - margin);
  const maxTop = Math.max(margin, containerHeight - bubbleHeight - margin);

  return {
    leftPx: Math.round(Math.min(Math.max(desiredLeft, margin), maxLeft)),
    topPx: Math.round(Math.min(Math.max(desiredTop, margin), maxTop)),
    maxHeightPx: Math.max(160, Math.round(containerHeight - margin * 2)),
  };
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
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const [clampedCoords, setClampedCoords] = useState<{
    leftPx: number;
    topPx: number;
    maxHeightPx: number;
  } | null>(null);

  const [selectedArrondissement, setSelectedArrondissement] = useState<number>(1);
  const associationContact = getParisAssociationContact(actor.id);
  const dpeDivisionContacts =
    actor.id === "evt-paris-nettoyages"
      ? resolveParisCleaningDivisionContacts([selectedArrondissement])
      : [];
  const isTownHallActor = actor.id === "mairie-paris-5" || actor.id === "mairie-paris-6";

  useLayoutEffect(() => {
    const bubbleEl = bubbleRef.current;
    const parentEl = bubbleEl?.parentElement;
    if (!bubbleEl || !parentEl || !anchorPosition) {
      return;
    }

    const updatePosition = () => {
      const containerWidth = parentEl.clientWidth || parentEl.getBoundingClientRect().width;
      const containerHeight = parentEl.clientHeight || parentEl.getBoundingClientRect().height;
      const bubbleWidth = bubbleEl.offsetWidth || bubbleEl.getBoundingClientRect().width;
      const bubbleHeight = bubbleEl.offsetHeight || bubbleEl.getBoundingClientRect().height;

      if (containerWidth <= 0 || containerHeight <= 0) {
        return;
      }

      const next = computeClampedBubblePosition({
        anchorPosition,
        containerWidth,
        containerHeight,
        bubbleWidth,
        bubbleHeight,
      });

      setClampedCoords((prev) =>
        prev &&
        prev.leftPx === next.leftPx &&
        prev.topPx === next.topPx &&
        prev.maxHeightPx === next.maxHeightPx
          ? prev
          : next,
      );
    };

    updatePosition();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(updatePosition);
      observer.observe(parentEl);
      observer.observe(bubbleEl);
      return () => observer.disconnect();
    }

    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [actor.id, anchorPosition]);

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
    ? clampedCoords
      ? {
          left: `${clampedCoords.leftPx}px`,
          top: `${clampedCoords.topPx}px`,
          maxHeight: `${clampedCoords.maxHeightPx}px`,
        }
      : {
          left: "12px",
          top: "12px",
          maxHeight: "calc(100% - 1.5rem)",
        }
    : undefined;

  return (
    <div
      ref={bubbleRef}
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
      } overflow-y-auto rounded-2xl border border-violet-300/35 bg-slate-950/95 p-4 text-xs text-slate-200 shadow-2xl backdrop-blur-xl`}
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

        {/* 3b. Financement (uniquement si documenté) */}
        {actor.funding && actor.funding.sources.length > 0 ? (
          <div className="rounded-lg border border-emerald-400/25 bg-emerald-500/5 p-2">
            <div className="flex items-center justify-between gap-2">
              <p className="font-black uppercase tracking-wider text-xs text-emerald-300">
                {fr ? "Financement" : "Funding"}
              </p>
              {isSafeHttpUrl(actor.funding.sourceUrl) ? (
                <a
                  href={actor.funding.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-200 underline decoration-emerald-400/50 underline-offset-2 hover:text-white"
                >
                  <span>{fr ? "Source" : "Source"}</span>
                  <ExternalLink size={10} aria-hidden="true" />
                </a>
              ) : null}
            </div>
            <p className="mt-1 leading-relaxed text-slate-200">
              {actor.funding.sources
                .map((src) => {
                  const parts: string[] = [src.label];
                  if (typeof src.sharePercent === "number") {
                    const formatted = fr
                      ? `${src.sharePercent.toString().replace(".", ",")} %`
                      : `${src.sharePercent}%`;
                    parts.push(formatted);
                  }
                  if (typeof src.amountEur === "number") {
                    parts.push(`${src.amountEur.toLocaleString(fr ? "fr-FR" : "en-US")} €`);
                  }
                  return parts.join(" ");
                })
                .join(" · ")}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {[
                actor.funding.entityName,
                actor.funding.calculationBase ?? actor.funding.period,
                !actor.funding.sharesPublished
                  ? fr
                    ? "Parts non publiées"
                    : "Shares not published"
                  : null,
                actor.funding.notes ?? null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
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

        {associationContact ? (
          <div className="rounded-lg border border-white/10 bg-white/5 p-2.5 text-xs text-slate-200">
            <p className="font-semibold text-white">
              {fr ? "Contact associatif sourcé" : "Sourced association contact"}
            </p>
            {associationContact.email ? (
              <p className="mt-1">
                {fr ? "Courriel :" : "Email:"} {associationContact.email}
              </p>
            ) : null}
            <p className="mt-1 text-slate-300">
              {associationContact.source.title} · {associationContact.source.verifiedOn}
            </p>
          </div>
        ) : null}

        {actor.id === "evt-paris-nettoyages" ? (
          <div className="rounded-lg border border-white/10 bg-white/5 p-2.5 text-xs text-slate-200">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-white">
                {fr ? "Divisions DPE (14 secteurs)" : "DPE divisions (14 sectors)"}
              </p>
              <select
                aria-label={fr ? "Arrondissement DPE" : "DPE district"}
                value={selectedArrondissement}
                onChange={(e) => setSelectedArrondissement(Number(e.target.value))}
                className="rounded border border-white/20 bg-slate-900 px-1.5 py-0.5 text-xs text-white"
              >
                {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}e
                  </option>
                ))}
              </select>
            </div>
            {dpeDivisionContacts.map((div) => (
              <div key={div.id} className="mt-1.5 space-y-0.5 text-slate-200">
                <p className="font-medium text-white">{div.label}</p>
                {div.phone ? <p>{fr ? "Tél. :" : "Phone:"} {div.phone}</p> : null}
                {div.email ? <p>{fr ? "Courriel :" : "Email:"} {div.email}</p> : null}
              </div>
            ))}
            <p className="mt-1.5 text-slate-300">
              {fr ? "Adresse administrative :" : "Administrative address:"} {PARIS_DPE_CONTACT.administrativeAddress}
            </p>
            <p className="mt-1 text-slate-300">{PARIS_DPE_CONTACT.logistics.note}</p>
          </div>
        ) : null}

        {isTownHallActor ? (
          <details className="rounded-lg border border-white/10 bg-white/5 p-2.5 text-xs text-slate-200">
            <summary className="cursor-pointer font-semibold text-white">
              {fr ? "17 mairies d'arrondissement" : "17 district town halls"}
            </summary>
            <ul className="mt-2 max-h-36 space-y-1 overflow-y-auto pr-1">
              {PARIS_MUNICIPAL_TOWN_HALLS.map((th) => (
                <li key={th.id} className="flex items-center justify-between gap-2">
                  <span>{th.label}</span>
                  <a
                    href={th.officialChannel}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-white"
                  >
                    {fr ? "Portail" : "Portal"}
                  </a>
                </li>
              ))}
            </ul>
          </details>
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
