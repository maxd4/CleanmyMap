import { cn } from "@/lib/utils";

export type MapEmptyStateMode = "filtered" | "empty" | "truncated";

export function resolveMapEmptyStateMode(
  itemCount: number,
  isTruncated: boolean,
): MapEmptyStateMode {
  return itemCount > 0 ? "filtered" : isTruncated ? "truncated" : "empty";
}

export function getMapEmptyStateCopy(
  mode: MapEmptyStateMode,
  hasZoneQuery: boolean,
  zoneQuery: string,
): { title: string; description: string } {
  if (mode === "truncated") {
    return {
      title: "Aucun résultat dans la fenêtre chargée",
      description:
        "La source cartographique est bornée et aucun résultat admissible n'a été trouvé dans la fenêtre chargée. Cette réponse ne permet pas de conclure à l'absence d'action dans tout le périmètre.",
    };
  }
  if (mode === "filtered") {
    return hasZoneQuery
      ? {
          title: "Aucune action dans cette zone",
          description: `La zone "${zoneQuery}" ne renvoie aucun point. Essaie un quartier, un arrondissement ou un libellé plus large.`,
        }
      : {
          title: "Aucun point visible avec ces filtres",
          description:
            "Les filtres actuels masquent toutes les actions. Réinitialise la vue ou relâche un critère pour faire réapparaître les points.",
        };
  }
  return {
    title: "Aucune action remontée sur ce périmètre",
    description:
      "La requête actuelle ne renvoie aucun point. Vérifie la période, le statut, les catégories visibles ou la source de données.",
  };
}

export function MapTruncationNotice({
  isTruncated,
  tone = "sky",
}: {
  isTruncated: boolean;
  tone?: "sky" | "emerald";
}) {
  if (!isTruncated) {
    return null;
  }
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 cmm-text-caption font-semibold tracking-[0.12em] text-slate-950",
        tone === "emerald"
          ? "border-emerald-300/40 bg-emerald-100"
          : "border-amber-300/40 bg-amber-100",
      )}
    >
      Résultats limités à la fenêtre chargée
    </span>
  );
}
