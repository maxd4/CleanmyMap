"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { AlertTriangle, ExternalLink, X } from "lucide-react";
import { getScheduledOperationsForActor } from "@/lib/partners/paris-cleanwalk-network.scheduled";
import { ScheduledOperationDetails } from "./paris-network-scheduled-operation";
import { projectPublicEntity } from "@/lib/partners/public-entity-projection";
import { getActorStructureContext } from "@/lib/partners/public-structure-context";
import { PublicStructureContextPanel } from "./public-structure-context-panel";
import { PublicEntityDetails } from "./public-entity-details";
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

  const canonicalDetails = isLocked ? projectPublicEntity({ networkActorId: actor.id }) : null;
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
          : "relative z-30 w-full min-w-0"
      } overflow-y-auto rounded-2xl border border-violet-300/35 bg-slate-950 p-4 text-sm leading-relaxed text-slate-200`}
    >
      {/* 1. Nom et rôle réel */}
      <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-2.5">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-violet-200">
            {roleLabels ? `${roleLabels} · ` : ""}{PARIS_ACTOR_CATEGORY_META[actor.category].shortLabel}
          </p>
          <h3 className="mt-0.5 text-lg font-semibold leading-snug text-white">
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

      {canonicalDetails ? <PublicEntityDetails projection={canonicalDetails} fr={fr}/> : <div className="mt-2.5 space-y-2.5">
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

        {actor.schoolProfile ? <section className="space-y-1">
          <p>UAI : {actor.schoolProfile.uai} · {actor.schoolProfile.level === "lycee_general" ? "Lycée général" : "École élémentaire"} · {actor.schoolProfile.sector === "public" ? "Public" : "Privé hors contrat"}</p>
          {new Set(actor.schoolProfile.addresses.map(a => a.label)).size > 1 ? <p className="text-amber-300">{fr ? "Adresses divergentes, à confirmer." : "Conflicting addresses, to confirm."}</p> : null}
          <ul>{actor.schoolProfile.addresses.map(a => <li key={a.sourceUrl}><a href={a.sourceUrl} target="_blank" rel="noreferrer" className="underline">{a.label} (source)</a></li>)}</ul>
        </section> : null}
        {getScheduledOperationsForActor(actor.id).map(op => <details key={op.id} className="rounded-lg border border-amber-400/30 p-2"><summary className="cursor-pointer font-semibold text-amber-300">{op.label} · {fr ? "programmée" : "scheduled"}</summary><div className="mt-2"><ScheduledOperationDetails operation={op} fr={fr}/></div></details>)}
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
            <p className="mt-1 text-sm text-slate-300">
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

        {isLocked ? <PublicStructureContextPanel key={actor.id} context={projectPublicEntity({ networkActorId: actor.id })?.structureContext ?? getActorStructureContext(actor.id)} fr={fr} /> : null}

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
      </div>}
    </div>
  );
}
