import type { ActionDataContract } from "@/lib/actions/data-contract";
import fallbackManifest from "../../../public/images/action-fallbacks/action-fallback-images.json";

export const ACTION_FALLBACK_ENVIRONMENTS = [
  "urban",
  "park",
  "forest",
  "riverside",
  "canal",
  "lake",
  "beach",
  "village",
  "countryside",
] as const;

export type ActionFallbackEnvironment =
  (typeof ACTION_FALLBACK_ENVIRONMENTS)[number];

export const ACTION_FALLBACK_KINDS = [
  "cleanup",
  "sorting",
  "cigarette_butts",
  "mixed_waste",
] as const;

export type ActionFallbackKind = (typeof ACTION_FALLBACK_KINDS)[number];

export type ActionFallbackImage = {
  id: string;
  publicPath: string;
  environment: ActionFallbackEnvironment;
  compatibleEnvironments: readonly ActionFallbackEnvironment[];
  actionKinds: readonly ActionFallbackKind[];
  hasPeople: boolean;
  waterContext: boolean;
  isNeutral: boolean;
  syntheticImage: boolean;
  mustNeverBePresentedAsFieldEvidence: boolean;
  alt: string;
};

export type ActionFallbackContext = {
  environment: ActionFallbackEnvironment | null;
  actionKind: ActionFallbackKind | null;
};

const FALLBACK_IMAGES = fallbackManifest.assets as readonly ActionFallbackImage[];

function normalize(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function includesAny(value: string, needles: readonly string[]): boolean {
  return needles.some((needle) => value.includes(needle));
}

function environmentFromCanonicalPlaceType(
  value: string | null | undefined,
): ActionFallbackEnvironment | null {
  const normalized = normalize(value);
  if (!normalized) {
    return null;
  }

  if (includesAny(normalized, ["plage", "littoral", "mer"])) {
    return "beach";
  }
  if (includesAny(normalized, ["lac", "etang", "étang"])) {
    return "lake";
  }
  if (includesAny(normalized, ["canal"])) {
    return "canal";
  }
  if (includesAny(normalized, ["riviere", "fleuve", "quai", "pont", "port"])) {
    return "riverside";
  }
  if (includesAny(normalized, ["foret"])) {
    return "forest";
  }
  if (includesAny(normalized, ["bois", "parc", "jardin", "square", "sentier"])) {
    return "park";
  }
  if (includesAny(normalized, ["village", "hameau"])) {
    return "village";
  }
  if (includesAny(normalized, ["campagne", "rural", "chemin rural"])) {
    return "countryside";
  }
  if (
    includesAny(normalized, [
      "rue",
      "allee",
      "villa",
      "ruelle",
      "impasse",
      "boulevard",
      "avenue",
      "place",
      "gare",
      "station",
      "portique",
      "galerie",
      "passage",
      "monument",
    ])
  ) {
    return "urban";
  }

  return null;
}

function getCanonicalPlaceTypeValues(contract: ActionDataContract): string[] {
  return [
    contract.metadata.placeType,
    contract.metadata.preparationData?.placeType,
  ].filter((value): value is string => Boolean(value?.trim()));
}

function resolveEnvironment(contract: ActionDataContract): ActionFallbackEnvironment | null {
  const canonicalPlaceType = getCanonicalPlaceTypeValues(contract)
    .map(environmentFromCanonicalPlaceType)
    .find((value): value is ActionFallbackEnvironment => value !== null);
  if (canonicalPlaceType) {
    return canonicalPlaceType;
  }

  const structuredGeography = [
    contract.metadata.preparationData?.communeZoneLabel,
    contract.metadata.departureLocationLabel,
    contract.metadata.arrivalLocationLabel,
  ]
    .map(environmentFromCanonicalPlaceType)
    .find((value): value is ActionFallbackEnvironment => value !== null);
  if (structuredGeography) {
    return structuredGeography;
  }

  // The location label is only consulted after all structured fields above.
  return environmentFromCanonicalPlaceType(contract.location.label);
}

function resolveActionKind(contract: ActionDataContract): ActionFallbackKind | null {
  const objective = normalize(contract.metadata.preparationData?.plannedObjective);
  if (objective === "collecte_megots") {
    return "cigarette_butts";
  }
  if (objective === "nettoyage") {
    return "cleanup";
  }
  if (objective === "action_mixte") {
    return "mixed_waste";
  }
  if (objective === "tri" || objective === "sensibilisation") {
    return "sorting";
  }

  const categories = [
    ...(contract.metadata.wasteCategories ?? []),
    ...(contract.metadata.preparationData?.expectedWasteCategories ?? []),
  ].map(normalize);
  if (categories.includes("cigarette_butt")) {
    return "cigarette_butts";
  }
  if (categories.length > 0) {
    return "mixed_waste";
  }

  return null;
}

export function getActionFallbackContext(
  contract: ActionDataContract,
): ActionFallbackContext {
  return {
    environment: resolveEnvironment(contract),
    actionKind: resolveActionKind(contract),
  };
}

function stableIndex(actionId: string, context: ActionFallbackContext, length: number): number {
  let hash = 2166136261;
  const seed = `${actionId}|${context.environment ?? "unknown"}|${context.actionKind ?? "unknown"}`;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % length;
}

function pickStable(
  candidates: readonly ActionFallbackImage[],
  actionId: string,
  context: ActionFallbackContext,
): ActionFallbackImage | null {
  if (candidates.length === 0) {
    return null;
  }
  return candidates[stableIndex(actionId, context, candidates.length)] ?? null;
}

export function selectActionFallback(
  contract: ActionDataContract,
): ActionFallbackImage | null {
  const context = getActionFallbackContext(contract);

  if (!context.environment) {
    return pickStable(
      FALLBACK_IMAGES.filter((image) => image.isNeutral),
      contract.id,
      context,
    );
  }

  const environmentCandidates = FALLBACK_IMAGES.filter((image) =>
    image.compatibleEnvironments.includes(context.environment as ActionFallbackEnvironment),
  );
  const kindCandidates = context.actionKind
    ? environmentCandidates.filter((image) =>
        image.actionKinds.includes(context.actionKind as ActionFallbackKind),
      )
    : environmentCandidates;

  return (
    pickStable(kindCandidates, contract.id, context) ??
    pickStable(environmentCandidates, contract.id, context) ??
    pickStable(
      FALLBACK_IMAGES.filter((image) => image.isNeutral),
      contract.id,
      context,
    )
  );
}

export function getUserProvidedActionImageUrl(
  contract: ActionDataContract,
): string | null {
  const photo = (contract.metadata.photos ?? []).find(
    (candidate) =>
      typeof candidate.dataUrl === "string" &&
      /^(?:data:image\/|https?:\/\/)/i.test(candidate.dataUrl),
  );
  return photo?.dataUrl ?? null;
}
