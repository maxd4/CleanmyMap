import { SCORE_THRESHOLDS } from "@/components/actions/map-marker-categories";
import type { ActionMapItem } from "@/lib/actions/types";

export type ScoreReading = {
  label: string;
  guidance: string;
  tone: "sky" | "emerald" | "amber" | "rose";
};

export type GeometryTone = {
  shell: string;
  accent: string;
  glow: string;
};

export function formatObservedDate(value: string | null | undefined): string {
  if (!value) {
    return "Date non renseignée";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed);
}

export function formatRecordType(item: ActionMapItem): string {
  const type = item.contract?.type ?? "action";

  switch (type) {
    case "action":
      return "Action terrain";
    case "clean_place":
      return "Lieu propre";
    case "spot":
      return "Signalement";
    default:
      return "Action";
  }
}

export function formatStatusLabel(status: string | undefined): string {
  switch (status) {
    case "approved":
      return "Validée";
    case "pending":
      return "En attente de validation";
    case "rejected":
      return "Rejetée";
    case "cleaned":
      return "Nettoyée";
    case "validated":
      return "Validée";
    case "new":
      return "Nouveau signalement";
    default:
      return "Statut inconnu";
  }
}

export function formatNumber(value: number | null | undefined, suffix = ""): string {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) {
    return `0${suffix}`;
  }

  return `${numeric.toLocaleString("fr-FR")}${suffix}`;
}

export function getScoreReading(score: number): ScoreReading {
  if (score <= 0) {
    return { label: "Lieu propre", guidance: "Pas d'urgence", tone: "sky" };
  }

  if (score < SCORE_THRESHOLDS.MEDIUM) {
    return { label: "Faible", guidance: "Suivi léger", tone: "emerald" };
  }

  if (score < SCORE_THRESHOLDS.CRITICAL) {
    return {
      label: "Moyen/Fort",
      guidance: "Passage à planifier",
      tone: "amber",
    };
  }

  return {
    label: "Critique",
    guidance: "Priorité d'intervention",
    tone: "rose",
  };
}

export function getGeometryTone(reality: string | null | undefined): GeometryTone {
  if (reality === "real") {
    return {
      shell:
        "border-emerald-200/70 bg-emerald-50/80 text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-950/25 dark:text-emerald-300",
      accent: "bg-emerald-500",
      glow: "from-emerald-400/20 via-emerald-500/10 to-transparent",
    };
  }

  if (reality === "estimated") {
    return {
      shell:
        "border-amber-200/70 bg-amber-50/80 text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/25 dark:text-amber-300",
      accent: "bg-amber-500",
      glow: "from-amber-400/20 via-amber-500/10 to-transparent",
    };
  }

  return {
    shell:
      "border-slate-200 bg-slate-50/90 text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300",
    accent: "bg-slate-400",
    glow: "from-slate-400/15 via-slate-500/8 to-transparent",
  };
}
