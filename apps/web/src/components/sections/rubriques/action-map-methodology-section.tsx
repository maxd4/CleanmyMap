"use client";

import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import {
  ACTION_POLLUTION_COLOR_STOPS,
  resolveDynamicColor,
} from "@/components/actions/map-marker-categories";
import {
  LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS,
} from "@/lib/actions/pollution/local-repollution-calibration";
import { PROJECTION_CONFIDENCE_CONSTANTS } from "@/lib/actions/pollution/projection-confidence";
import {
  buildActionPollutionProjectionMethodology,
} from "@/lib/actions/pollution/revisit-priority";
import { CmmButton } from "@/components/ui/cmm-button";

export type OpenSourceDoc = {
  id: string;
  title: { fr: string; en: string };
  desc: { fr: string; en: string };
  href: string;
  icon: ReactNode;
  isPdf: boolean;
  secondaryAction?: {
    href: string;
    label: { fr: string; en: string };
  };
};

export function ReferenceDocCard({
  doc,
  schemaLabel,
  schemaHref,
  isFrench,
}: {
  doc: OpenSourceDoc;
  schemaLabel: { fr: string; en: string };
  schemaHref: string;
  isFrench: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-rose-100 bg-white p-6 shadow-[0_16px_38px_-30px_rgba(190,24,93,0.24)]">
      <div className="mb-6 flex items-start gap-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-400/10 text-red-400 shadow-inner">
          {doc.icon}
        </div>
        <div>
          <h3 className="mb-2 text-xl font-bold text-slate-950">{doc.title[isFrench ? "fr" : "en"]}</h3>
          <p className="text-xs font-medium leading-relaxed cmm-text-small">{doc.desc[isFrench ? "fr" : "en"]}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 cmm-text-caption font-black uppercase tracking-widest text-rose-800">
          {schemaLabel[isFrench ? "fr" : "en"]}
        </span>
        {doc.isPdf ? (
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 cmm-text-caption font-black uppercase tracking-widest cmm-text-small">
            PDF
          </span>
        ) : null}
      </div>
      <CmmButton href={doc.href} tone="destructive" variant="pill" width="wide" className="mt-6 cmm-text-caption font-black uppercase tracking-widest">
        <ExternalLink size={14} />
        {isFrench ? "Consulter le fichier" : "Open file"}
      </CmmButton>
      <CmmButton href={doc.secondaryAction?.href ?? schemaHref} tone="tertiary" variant="pill" width="wide" className="mt-3 cmm-text-caption font-black uppercase tracking-widest">
        <ExternalLink size={14} />
        {doc.secondaryAction
          ? doc.secondaryAction.label[isFrench ? "fr" : "en"]
          : isFrench
            ? "Voir le schéma"
            : "View schema"}
      </CmmButton>
    </div>
  );
}

export function ActionMapMethodologySection({
  isFrench,
  actionMapDoc,
}: {
  isFrench: boolean;
  actionMapDoc: OpenSourceDoc | undefined;
}) {
  const projection = buildActionPollutionProjectionMethodology();

  if (!actionMapDoc) {
    return null;
  }

  return (
    <section
      id="methodologie-carte-actions"
      className="scroll-mt-8 space-y-8 rounded-[2rem] border border-rose-100 bg-white p-6 text-slate-950 shadow-[0_20px_52px_-38px_rgba(190,24,93,0.28)] md:p-10"
    >
      <div className="space-y-4">
        <p className="cmm-text-caption font-black uppercase tracking-[0.35em] text-rose-700">
          {isFrench ? "Référence cartographique" : "Cartographic reference"}
        </p>
        <h2 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
          {isFrench
            ? "Méthodologie de la carte d'actions"
            : "Action map methodology"}
        </h2>
        <p className="max-w-4xl text-base font-medium leading-relaxed cmm-text-body">
          {isFrench
            ? "Le calque Actions conserve la mémoire des interventions et projette une remontée de pollution à partir de la dernière action. Trash Spotter reste la lecture opérationnelle des pollutions actuellement signalées et actionnables."
            : "The Actions layer keeps intervention history and projects pollution recovery from the last action. Trash Spotter remains the operational view of currently reported and actionable pollution."}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: isFrench ? "Pollution constatée" : "Observed pollution",
            text: isFrench
              ? "Score historique S exprimé en % constaté avant l'action. Il n'est jamais réécrit par le temps."
              : "Historical score S expressed as % observed before the action. Time never rewrites it.",
          },
          {
            title: isFrench ? "Pollution projetée" : "Projected pollution",
            text: isFrench
              ? "Estimation P exprimée en % calculée depuis le score historique et le temps écoulé."
              : "Estimate P expressed as % calculated from the historical score and elapsed time.",
          },
          {
            title: isFrench ? "Dernière action" : "Last action",
            text: isFrench
              ? "Date de référence pour calculer le nombre de jours écoulés t."
              : "Reference date used to calculate elapsed days t.",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-rose-100 bg-rose-50/45 p-5"
          >
            <h3 className="text-sm font-black text-slate-950">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed cmm-text-body">
              {item.text}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
        <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-950">
          {isFrench ? "Deux lectures, une même source" : "Two readings, one source"}
        </h3>
        <p className="mt-3 text-sm leading-relaxed cmm-text-body">
          {isFrench
            ? "Le contrôle Observé affiche uniquement la dernière observation terrain réelle. Projeté aujourd'hui calcule l'état courant avec le modèle et la calibration disponible ; une observation plus récente reste prioritaire. Le baseline S_post = 0 n'est jamais présenté comme une observation."
            : "Observed shows only the latest real field observation. Projected today computes the current state with the available model and calibration; a newer observation remains authoritative. The S_post = 0 baseline is never presented as an observation."}
        </p>
        <p className="mt-3 text-xs leading-relaxed cmm-text-small">
          {isFrench
            ? "Les libellés de provenance indiquent « Observé le … » ou « Projeté aujourd'hui · dernière observation le … ». La bascule ne réinitialise ni la vue, ni la sélection, ni les calques ; elle ne change pas les couleurs ou la grammaire géométrique."
            : "Provenance labels show ‘Observed on …’ or ‘Projected today · last observation on …’. Switching does not reset the viewport, selection, or layers; it does not change colors or geometric grammar."}
        </p>
      </div>

      <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-5">
        <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-950">
          {isFrench ? "État courant par lieu" : "Current state by place"}
        </h3>
        <p className="mt-3 text-sm leading-relaxed cmm-text-body">
          {isFrench
            ? "Le resolver canonique réutilise les règles spatiales de la calibration et conserve les enregistrements sources. Sa priorité est : observation terrain récente, puis projection, puis historique si aucune projection exploitable n'est disponible."
            : "The canonical resolver reuses the calibration spatial rules and keeps source records intact. Its priority is: recent field observation, then projection, then history when no usable projection is available."}
        </p>
        <ul className="mt-3 grid gap-2 text-sm leading-relaxed cmm-text-body md:grid-cols-3">
          <li>
            {isFrench
              ? "Trash Spotter quantitatif : observed · measured."
              : "Quantified Trash Spotter: observed · measured."}
          </li>
          <li>
            {isFrench
              ? "Trash Spotter qualitatif : Pollution observée · niveau non quantifié."
              : "Qualitative Trash Spotter: observed pollution · level not quantified."}
          </li>
          <li>
            {isFrench
              ? "clean_place : lieu explicitement propre, sans score fabriqué."
              : "clean_place: explicitly clean place, without an invented score."}
          </li>
        </ul>
        <p className="mt-3 text-xs leading-relaxed text-rose-800">
          {isFrench
            ? "Chaque état expose source observed|projected|historical, scoreKind measured|projected|unavailable, provenance, date et action historique. Un spot ponctuel ne recolore jamais une polyline. Lorsqu’aucune mesure quantifiée Trash Spotter n’est disponible, aucun score n’est fabriqué."
            : "Each state exposes source observed|projected|historical, scoreKind measured|projected|unavailable, provenance, date, and action history. A point spot never recolors a polyline. When no quantified Trash Spotter measurement is available, no score is fabricated."}
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
        <div className="space-y-5">
          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5">
            <p className="cmm-text-caption font-black uppercase tracking-[0.2em] text-sky-800">
              {isFrench ? "Projection runtime" : "Runtime projection"}
            </p>
            <p className="mt-3 overflow-x-auto font-mono text-sm leading-relaxed text-sky-900">
              {projection.t80Formula}
              <br />
              {projection.projectionFormula}
            </p>
            <p className="mt-3 text-xs leading-relaxed cmm-text-body">
              {projection.decayConstantFormula}. {isFrench
                ? "Sans mesure post-action explicite, S_post = 0 est un baseline de modèle, pas une mesure de propreté. Une mesure réelle post-action est prioritaire."
                : "Without an explicit post-action measurement, S_post = 0 is a model baseline, not a cleanliness measurement. A real post-action measurement takes priority."}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {projection.orderOfMagnitude.map((item) => (
              <div
                key={item.historicalScore}
                className="flex items-center justify-between rounded-xl border border-rose-100 bg-white px-4 py-3 text-sm"
              >
                <span className="cmm-text-body">
                  S = {item.historicalScore}
                </span>
                <strong className="text-rose-800">
                  T80 ≈ {Math.round(item.t80Days)} j
                </strong>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
            <p className="cmm-text-caption font-black uppercase tracking-[0.2em] cmm-text-body">
              {isFrench ? "Confiance de la projection" : "Projection confidence"}
            </p>
            <p className="mt-3 text-sm leading-relaxed cmm-text-body">
              {isFrench
                ? "Le resolver pur qualifie la robustesse des données d'entrée, pas la probabilité que le modèle soit juste. Il combine la géométrie, la source de S_post, la calibration locale et la complétude de l'historique."
                : "The pure resolver qualifies input-data robustness, not the probability that the model is correct. It combines geometry, the S_post source, local calibration, and history completeness."}
            </p>
            <ul className="mt-3 grid gap-2 text-sm leading-relaxed cmm-text-body md:grid-cols-3">
              <li>
                {isFrench
                  ? `Élevée : géométrie fiable (≥ ${PROJECTION_CONFIDENCE_CONSTANTS.reliableGeometryMinimum}), S_post mesuré, au moins ${LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.minimumIntervalsForOverride} intervalles locaux valides et historique complet.`
                  : `High: reliable geometry (≥ ${PROJECTION_CONFIDENCE_CONSTANTS.reliableGeometryMinimum}), measured S_post, at least ${LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.minimumIntervalsForOverride} valid local intervals, and complete history.`}
              </li>
              <li>
                {isFrench
                  ? `Moyenne : au moins ${PROJECTION_CONFIDENCE_CONSTANTS.minimumSolidEvidenceForMedium} preuves solides, sans réunir toutes les conditions du niveau élevé.`
                  : `Medium: at least ${PROJECTION_CONFIDENCE_CONSTANTS.minimumSolidEvidenceForMedium} solid proofs without meeting every high-level condition.`}
              </li>
              <li>
                {isFrench
                  ? "Faible : niveau par défaut pour un baseline de modèle, une géométrie approximative ou un historique insuffisant/partiel."
                  : "Low: default for a model baseline, approximate geometry, or insufficient/partial history."}
              </li>
            </ul>
            <p className="mt-3 text-xs leading-relaxed cmm-text-small">
              {isFrench
                ? "Cette confiance décrit la qualité des données d’entrée ; elle ne mesure pas l’exactitude du modèle et ne remplace pas une mesure réelle."
                : "This confidence describes input-data quality; it does not measure model accuracy and does not replace a real measurement."}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-5">
            <p className="cmm-text-caption font-black uppercase tracking-[0.2em] text-rose-700">
              {isFrench ? "Limite d'interprétation" : "Interpretation limit"}
            </p>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-rose-900">
              {isFrench
                ? "Heuristique versionnée · pas une mesure en temps réel."
                : "Versioned heuristic · not a real-time measurement."}
            </p>
          </div>

          <ReferenceDocCard
            doc={actionMapDoc}
            schemaLabel={{
              fr: "Documentation produit",
              en: "Product documentation",
            }}
            schemaHref="#methodologie-carte-actions"
            isFrench={isFrench}
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-rose-200 bg-rose-50/55 p-5">
          <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-950">
            {isFrench ? "Calibration locale" : "Local calibration"}
          </h3>
          <p className="mt-3 text-sm leading-relaxed cmm-text-body">
            {isFrench
              ? "Le runtime peut regrouper conservativement des actions sous une identité dérivée de lieu (derivedPlaceKey). Les données actuelles ne fournissent pas d’identifiant canonique de lieu."
              : "The runtime can conservatively group actions under a derived place identity (derivedPlaceKey). The current data does not provide a canonical place identifier."}
          </p>
          <ul className="mt-3 grid gap-2 text-sm leading-relaxed cmm-text-body">
            <li>
              {isFrench
                ? `≤ ${LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.nearDistanceMeters} m : distance suffisante ; entre ${LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.nearDistanceMeters} et ${LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.labelRequiredDistanceMeters} m : libellés normalisés compatibles requis ; au-delà : aucun rapprochement.`
                : `≤ ${LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.nearDistanceMeters} m: distance is sufficient; between ${LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.nearDistanceMeters} and ${LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.labelRequiredDistanceMeters} m: compatible normalized labels are required; beyond that: no merge.`}
            </li>
            <li>
              {isFrench
                ? `Points et zones uniquement ; les longues polylines/parcours sont exclues. Les intervalles de re-pollution nécessitent au moins ${LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.minimumIntervalDays} jours et un T80 local borné entre ${LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.minimumT80Days} et ${LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.maximumT80Days} jours.`
                : `Points and areas only; long polylines/routes are excluded. Repollution intervals require at least ${LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.minimumIntervalDays} days and a local T80 bounded between ${LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.minimumT80Days} and ${LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.maximumT80Days} days.`}
            </li>
            <li>
              {isFrench
                ? `La médiane des intervalles valides est informative dès ${LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.minimumIntervalsForOverride - 1} intervalle, mais ne remplace le fallback générique qu'à partir de ${LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.minimumIntervalsForOverride}. Confiance medium à ${LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.mediumConfidenceIntervals}, high à ${LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.highConfidenceIntervals}.`
                : `The median of valid intervals is informative from ${LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.minimumIntervalsForOverride - 1} interval, but replaces the generic fallback only from ${LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.minimumIntervalsForOverride}. Medium confidence starts at ${LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.mediumConfidenceIntervals}; high at ${LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.highConfidenceIntervals}.`}
            </li>
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-rose-800">
            {isFrench
              ? "Une source partielle (fenêtre, limite ou viewport non exhaustif) n’est pas utilisée pour la calibration locale : le modèle générique reste utilisé."
              : "A partial source (window, limit, or non-exhaustive viewport) is not used for local calibration: the generic model remains in use."}
          </p>
        </div>

        <div>
          <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-950">
            {isFrench ? "Couleurs des actions" : "Action colors"}
          </h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {ACTION_POLLUTION_COLOR_STOPS.map((stop) => (
              <p key={stop.key} className="flex items-center gap-2 text-sm cmm-text-body">
                <span
                  className="h-3 w-3 rounded-full border border-slate-300"
                  style={{ backgroundColor: resolveDynamicColor(stop.threshold) }}
                  aria-hidden="true"
                />
                {stop.label} · repère {stop.threshold}
              </p>
            ))}
          </div>
          <p className="mt-3 text-xs leading-relaxed cmm-text-small">
            {isFrench
              ? "Le vert est réservé aux lieux explicitement propres ; il n'est jamais un niveau de faible pollution pour une action."
              : "Green is reserved for explicitly clean places; it is never a low-pollution level for an action."}
          </p>
        </div>

        <div>
          <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-950">
            {isFrench ? "Grammaire géométrique" : "Geometry grammar"}
          </h3>
          <ul className="mt-3 grid gap-2 text-sm leading-relaxed cmm-text-body">
            <li>Ligne pleine : parcours déclaré/connu.</li>
            <li>Ligne pointillée : parcours reconstruit/indicatif.</li>
            <li>Polygon rempli : zone réelle ou indicative, selon l&apos;opacité.</li>
            <li>Point : localisation seule.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
