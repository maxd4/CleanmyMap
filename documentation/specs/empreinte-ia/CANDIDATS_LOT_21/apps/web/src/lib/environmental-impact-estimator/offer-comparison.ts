/**
 * PLAN, lot 21. Moteur pur de sélection économique et de projection graphique.
 * Ne mesure ni prix réel, ni qualité, ni énergie, ni localisation : ses entrées
 * doivent être établies par les propriétaires de ces preuves.
 * Pas d'écriture réseau ou BDD. Pas de calcul environnemental concurrent.
 */
import type { ExecutionEnvironment, WeightsAvailability } from "./model-catalog";

/** Intervalle borné inclusif ; les bornes et la preuve ne sont jamais déduites du milieu. */
export type OfferRange = Readonly<{ min: number; max: number }>;
export type OfferEvidence = Readonly<{
  checkedAt: string;
  sourceUrls: readonly string[];
  note?: string;
}>;
export type OfferCostScope = "FULL_ATTRIBUTABLE" | "LOCAL_MARGINAL" | "LOCAL_TCO" | "SUBSCRIPTION_ALLOCATED";
export type OfferPriceMethod = "BILLED" | "PUBLISHED_TARIFF_MODELED" | "ALLOCATION_SCENARIO" | "SUBSCRIPTION_PERIOD_ALLOCATED";
export type OfferPhysicalBoundary = "GPU_ONLY" | "IT_FULL" | "FACILITY" | "LOCAL_WALL";
/** Mode commercial : ne pas assimiler abonnement et tarif API. */
export type OfferBillingMode = "API" | "SUBSCRIPTION" | "LOCAL_OWNED";
export type OfferUserPreferences = Readonly<{
  billingMode: OfferBillingMode;
  /** Application de code préférée, telle que cursor, codex, github_copilot. Facultatif. */
  codingPlatformId?: string | null;
  /** Forfait actuellement souscrit. Le bonus ne présume jamais d'un accès sans forfait vérifié. */
  currentPlanId?: string | null;
}>;
export type OfferAccess = Readonly<{
  billingMode: OfferBillingMode;
  /** Plateformes où la combinaison exacte modèle + effort est disponible. */
  codingPlatformIds: readonly string[];
  /** Configuration exacte de raisonnement exécutée, même pour une tâche non code. */
  reasoningConfigurationId: string;
  /** Plateforme de l'abonnement qui couvre effectivement cette offre, et non une liste marketing. */
  subscriptionPlatformId?: string | null;
  /** Modes de raisonnement prouvés disponibles sur la plateforme/plan exacts. */
  verifiedReasoningConfigurationIds?: readonly string[];
  subscriptionPlanId?: string | null;
  subscriptionPlanAvailability?: "VERIFIED" | "UNAVAILABLE" | "UNKNOWN";
}>;
/** Validation indépendante de l'offre et du coût sur une même batterie de tâches de code. */
export type OfferCodingAssessment = Readonly<{
  benchmarkId: string;
  /** Catégories et difficulté des tâches, identiques entre référence et candidat. */
  codingWorkloadId: string;
  /** La configuration de raisonnement fait partie de l'identité mesurée du déploiement. */
  reasoningConfigurationId: string;
  /** Intervalle robuste de réussite [0,1], pas un score général d'intelligence. */
  successRate: OfferRange;
  /** Tests, sécurité, outils et contraintes critiques sans régression. */
  criticalRequirementsPassed: boolean;
  evidence: OfferEvidence;
}>;

export type OfferProcessingLocation =
  | "SINGLE_REGION_VERIFIED"
  | "REGIONAL_SET_VERIFIED"
  | "REGIONAL_WEIGHTED_VERIFIED"
  | "UNKNOWN"
  | "INPUT_OR_STORAGE_REGION_ONLY";

export type OfferCampaign = Readonly<{
  /** Nombre de tâches initiales distinctes ; une relance ne crée pas une nouvelle tâche. */
  attemptedTasks: number;
  successfulTasks: number;
  successDefinitionId: string;
  workloadId: string;
  /** Une comparaison de code exige un protocole de qualité dédié. */
  workloadDomain: "CODE" | "NON_CODE";
  /** Le prix inclut tous les essais, reprises, outils et tâches échouées attribuables. */
  price: Readonly<{
    totalEur: OfferRange;
    scope: OfferCostScope;
    method: OfferPriceMethod;
    evidence: OfferEvidence;
    /** Obligatoire pour une comparaison économique d'abonnements. */
    subscriptionAttribution?: Readonly<{
      periodId: string;
      planId: string;
      fullPeriodFeeAndOveragesIncluded: boolean;
      quotaSufficientForWorkload: boolean;
    }>;
  }> | null;
  energy: Readonly<{
    totalKwh: OfferRange;
    boundary: OfferPhysicalBoundary;
    evidence: OfferEvidence;
  }> | null;
  /** Carbone opérationnel location-based calculé en amont par l'owner scientifique. */
  operationalCarbon: Readonly<{
    totalKgCo2e: OfferRange;
    location: OfferProcessingLocation;
    accountingMethodId: string;
    boundary: "LOCATION_BASED_OPERATIONAL";
    evidence: OfferEvidence;
  }> | null;
}>;

export type OfferCandidate = Readonly<{
  id: string;
  name: string;
  modelId: string;
  modelVersion: string;
  providerId: string;
  deploymentId: string;
  executionEnvironment: ExecutionEnvironment;
  weightsAvailability: WeightsAvailability;
  access: OfferAccess;
  /** Null ou non comparable : aucune équivalence de code démontrée. */
  codingAssessment: OfferCodingAssessment | null;
  /** Ces contrôles sont effectués hors du moteur et exigent des preuves datées. */
  evidence: OfferEvidence;
  kind: "REAL_VERIFIED" | "SCENARIO_ONLY";
  quality: "PASS" | "FAIL" | "UNPROVEN";
  capabilities: "PASS" | "FAIL" | "UNPROVEN";
  privacy: "PASS" | "FAIL" | "UNPROVEN";
  availability: "PASS" | "FAIL" | "UNPROVEN";
  campaign: OfferCampaign;
}>;

export type OfferEligibilityStatus =
  | "BASELINE"
  | "ELIGIBLE_PRICE"
  | "OVER_PRICE_CAP"
  | "PRICE_ELIGIBILITY_UNCERTAIN"
  | "PRICE_UNKNOWN"
  | "COST_BOUNDARY_MISMATCH"
  | "WORKLOAD_MISMATCH"
  | "ENVIRONMENT_MISMATCH"
  | "QUALITY_UNPROVEN"
  | "QUALITY_INSUFFICIENT"
  | "CAPABILITIES_UNPROVEN"
  | "CAPABILITIES_INSUFFICIENT"
  | "PRIVACY_BLOCKED"
  | "AVAILABILITY_UNPROVEN"
  | "UNAVAILABLE"
  | "SCENARIO_ONLY"
  | "REFERENCE_UNVERIFIED"
  | "BILLING_MODE_MISMATCH"
  | "SUBSCRIPTION_ACCESS_UNPROVEN"
  | "SUBSCRIPTION_PLAN_UNAVAILABLE"
  | "CODING_PROFILE_MISMATCH"
  | "REASONING_CONFIGURATION_UNPROVEN"
  | "ACCESS_RUNTIME_MISMATCH";

export type OfferPlotPoint = Readonly<{
  id: string;
  name: string;
  /** Euros par tâche réussie. */
  xEuroPerSuccess: number;
  /** Grammes CO2e opérationnels location-based par tâche réussie. */
  yGramsCo2ePerSuccess: number;
  isReference: boolean;
  onPriceCarbonParetoFront: boolean;
  /** Bonus discret, seulement à prix/carbone proches et forfait vérifié. */
  platformContinuityPreferred: boolean;
}>;

export type EvaluatedOffer = Readonly<{
  offer: OfferCandidate;
  eligibility: OfferEligibilityStatus;
  priceEuroPerSuccess: OfferRange | null;
  energyWhPerSuccess: OfferRange | null;
  carbonGramsCo2ePerSuccess: OfferRange | null;
  /** Le graphe est strict : pas de point lorsqu'un axe est inconnu ou borné. */
  canPlot: boolean;
  platformContinuityPreferred: boolean;
  /** Diagnostics complémentaires non bloquants, sans interpolation ni hypothèse implicite. */
  warnings: readonly string[];
}>;

export type OfferComparison = Readonly<{
  referenceId: string;
  preferences: OfferUserPreferences;
  maxCostMultiplier: number;
  robustPriceCapEuroPerSuccess: number | null;
  offers: readonly EvaluatedOffer[];
  plotPoints: readonly OfferPlotPoint[];
}>;

const MAX_PRICE_MULTIPLIER = 1.15;
/** L'affinité plateforme ne départage que des offres à <= 3 % de prix ET carbone. */
const MAX_PLATFORM_NEAR_TIE = 1.03;

function canonicalId(id: string | null | undefined): string {
  return (id ?? "").trim().toLowerCase();
}

function accessRuntimeCompatible(offer: OfferCandidate): boolean {
  return offer.executionEnvironment === "local_device"
    ? offer.access.billingMode === "LOCAL_OWNED"
    : offer.access.billingMode !== "LOCAL_OWNED";
}

function subscribedReasoningVerified(offer: OfferCandidate): boolean {
  return offer.access.subscriptionPlanAvailability === "VERIFIED" &&
    Boolean(offer.access.subscriptionPlatformId?.trim()) &&
    offer.access.codingPlatformIds.some((id) =>
      canonicalId(id) === canonicalId(offer.access.subscriptionPlatformId)) &&
    offer.access.verifiedReasoningConfigurationIds?.some((id) =>
      canonicalId(id) === canonicalId(offer.access.reasoningConfigurationId)) === true;
}

function eligibleForSameSubscriptionPlatform(
  offer: OfferCandidate,
  preferences: OfferUserPreferences,
): boolean {
  const platform = canonicalId(preferences.codingPlatformId);
  const plan = canonicalId(preferences.currentPlanId);
  return preferences.billingMode === "SUBSCRIPTION" && Boolean(platform && plan) &&
    offer.access.billingMode === "SUBSCRIPTION" &&
    subscribedReasoningVerified(offer) &&
    canonicalId(offer.access.subscriptionPlanId) === plan &&
    canonicalId(offer.access.subscriptionPlatformId) === platform;
}

function validCodingAssessment(offer: OfferCandidate): boolean {
  const c = offer.codingAssessment;
  return Boolean(c && c.benchmarkId.trim() && c.codingWorkloadId === offer.campaign.workloadId &&
    c.reasoningConfigurationId.trim() &&
    canonicalId(c.reasoningConfigurationId) === canonicalId(offer.access.reasoningConfigurationId) &&
    validRange(c.successRate) &&
    c.successRate.max <= 1 && c.criticalRequirementsPassed && proven(c.evidence));
}

function comparableCoding(reference: OfferCandidate, candidate: OfferCandidate):
  "PASS" | "MISMATCH" | "UNPROVEN" | "FAIL" | "REASONING_UNPROVEN" {
  if (reference.campaign.workloadDomain !== candidate.campaign.workloadDomain) return "MISMATCH";
  if (reference.campaign.workloadDomain === "NON_CODE") {
    return candidate.access.reasoningConfigurationId.trim() ? "PASS" : "REASONING_UNPROVEN";
  }
  if (!candidate.access.reasoningConfigurationId.trim() ||
    (candidate.codingAssessment && !candidate.codingAssessment.reasoningConfigurationId.trim())) {
    return "REASONING_UNPROVEN";
  }
  if (candidate.codingAssessment?.criticalRequirementsPassed === false) return "FAIL";
  if (!validCodingAssessment(reference) || !validCodingAssessment(candidate)) return "UNPROVEN";
  const a = reference.codingAssessment!;
  const b = candidate.codingAssessment!;
  if (a.benchmarkId !== b.benchmarkId || a.codingWorkloadId !== b.codingWorkloadId) return "MISMATCH";
  // Raisonnement différent permis UNIQUEMENT lorsque chaque configuration est évaluée.
  return b.successRate.min + MAX_SUCCESS_RATE_DROP_ABSOLUTE + 1e-12 >= a.successRate.max
    ? "PASS" : "FAIL";
}

/** Tolérance produit du §17.2 : 3 points de pourcentage absolus, non une preuve statistique. */
const MAX_SUCCESS_RATE_DROP_ABSOLUTE = 0.03;

function validRange(value: OfferRange | null | undefined): value is OfferRange {
  return Boolean(
    value && Number.isFinite(value.min) && Number.isFinite(value.max) &&
      value.min >= 0 && value.max >= value.min,
  );
}

function proven(evidence: OfferEvidence | null | undefined): boolean {
  return Boolean(
    evidence?.checkedAt && !Number.isNaN(Date.parse(evidence.checkedAt)) &&
      evidence.sourceUrls.length > 0 && evidence.sourceUrls.every((url) => /^https:\/\//i.test(url)),
  );
}

function validCampaign(campaign: OfferCampaign): boolean {
  return Number.isSafeInteger(campaign.attemptedTasks) &&
    Number.isSafeInteger(campaign.successfulTasks) &&
    campaign.attemptedTasks > 0 &&
    campaign.successfulTasks > 0 &&
    campaign.successfulTasks <= campaign.attemptedTasks &&
    Boolean(campaign.successDefinitionId) && Boolean(campaign.workloadId) &&
    (campaign.workloadDomain === "CODE" || campaign.workloadDomain === "NON_CODE");
}

function normalize(total: OfferRange, successes: number, toUnit = 1): OfferRange {
  return { min: total.min * toUnit / successes, max: total.max * toUnit / successes };
}

function checkedNormalize(total: OfferRange, successes: number, multiplier = 1): OfferRange | null {
  const range = normalize(total, successes, multiplier);
  return validRange(range) ? range : null;
}

function normalizedPrice(offer: OfferCandidate): OfferRange | null {
  const { campaign } = offer;
  if (!validCampaign(campaign) || !campaign.price ||
    !validRange(campaign.price.totalEur) || !proven(campaign.price.evidence)) return null;
  const price = campaign.price;
  const mode = offer.access.billingMode;
  if (mode === "SUBSCRIPTION") {
    const attr = price.subscriptionAttribution;
    if (price.scope !== "SUBSCRIPTION_ALLOCATED" ||
      price.method !== "SUBSCRIPTION_PERIOD_ALLOCATED" || !attr ||
      !attr.periodId.trim() || !attr.planId.trim() ||
      canonicalId(attr.planId) !== canonicalId(offer.access.subscriptionPlanId) ||
      !attr.fullPeriodFeeAndOveragesIncluded || !attr.quotaSufficientForWorkload) return null;
  } else if (price.scope === "SUBSCRIPTION_ALLOCATED" ||
    price.method === "SUBSCRIPTION_PERIOD_ALLOCATED") return null;
  return checkedNormalize(price.totalEur, campaign.successfulTasks);
}

function normalizedEnergy(offer: OfferCandidate): OfferRange | null {
  const { campaign } = offer;
  return validCampaign(campaign) && campaign.energy &&
    validRange(campaign.energy.totalKwh) && proven(campaign.energy.evidence)
    ? checkedNormalize(campaign.energy.totalKwh, campaign.successfulTasks, 1_000)
    : null;
}

function normalizedCarbon(offer: OfferCandidate): OfferRange | null {
  const { campaign } = offer;
  const carbon = campaign.operationalCarbon;
  if (!validCampaign(campaign) || !carbon || !validRange(carbon.totalKgCo2e) ||
    !proven(carbon.evidence) || carbon.boundary !== "LOCATION_BASED_OPERATIONAL" ||
    !carbon.accountingMethodId ||
    carbon.location === "UNKNOWN" || carbon.location === "INPUT_OR_STORAGE_REGION_ONLY") {
    return null;
  }
  return checkedNormalize(carbon.totalKgCo2e, campaign.successfulTasks, 1_000);
}

function lessOrEqualWithFloatingSafety(a: number, b: number): boolean {
  return a <= b + Number.EPSILON * Math.max(1, Math.abs(a), Math.abs(b)) * 2;
}

function isSingleExact(range: OfferRange | null): range is OfferRange {
  return range !== null && range.min === range.max;
}

/** Le Pareto ne cache jamais les points dominés et ne suppose pas de score unique. */
export function priceCarbonPareto(points: readonly Pick<OfferPlotPoint, "id" | "xEuroPerSuccess" | "yGramsCo2ePerSuccess">[]): string[] {
  return points.filter((candidate) =>
    !points.some((other) => other.id !== candidate.id &&
      other.xEuroPerSuccess <= candidate.xEuroPerSuccess &&
      other.yGramsCo2ePerSuccess <= candidate.yGramsCo2ePerSuccess &&
      (other.xEuroPerSuccess < candidate.xEuroPerSuccess ||
        other.yGramsCo2ePerSuccess < candidate.yGramsCo2ePerSuccess)),
  ).map((point) => point.id);
}

/**
 * Ne classe pas automatiquement une « meilleure IA ». Le résultat contient
 * les offres économiquement admissibles, les preuves manquantes et tous les points.
 * Les hypothèses d'énergie et de CO2e ne sont jamais converties en chiffres réels.
 */
export function compareOffers(
  reference: OfferCandidate,
  candidates: readonly OfferCandidate[],
  preferences: OfferUserPreferences = { billingMode: reference.access.billingMode },
): OfferComparison {
  const refPrice = normalizedPrice(reference);
  const refEnergy = normalizedEnergy(reference);
  const refCarbon = normalizedCarbon(reference);
  const refCampaign = reference.campaign;
  const refSuccessRate = validCampaign(refCampaign)
    ? refCampaign.successfulTasks / refCampaign.attemptedTasks : null;
  const referenceQualityProven = reference.kind === "REAL_VERIFIED" && proven(reference.evidence) &&
    reference.quality === "PASS" && reference.capabilities === "PASS" &&
    reference.privacy === "PASS" &&
    (reference.campaign.workloadDomain === "NON_CODE" || validCodingAssessment(reference)) &&
    reference.access.billingMode === preferences.billingMode &&
    accessRuntimeCompatible(reference) &&
    (preferences.billingMode !== "SUBSCRIPTION" || subscribedReasoningVerified(reference));
  const ids = new Set<string>();
  for (const offer of [reference, ...candidates]) {
    if (!offer.id.trim() || ids.has(offer.id)) {
      throw new Error("Offre sans identifiant stable ou identifiant dupliqué");
    }
    ids.add(offer.id);
  }
  const refCap = refPrice && refPrice.min > 0 ? refPrice.min * MAX_PRICE_MULTIPLIER : null;
  const evaluated: EvaluatedOffer[] = [];

  for (const [index, offer] of [reference, ...candidates].entries()) {
    const price = normalizedPrice(offer);
    const energy = normalizedEnergy(offer);
    let carbon = normalizedCarbon(offer);
    const warnings: string[] = [];
    const first = index === 0;
    let eligibility: OfferEligibilityStatus;

    if (!first) {
      if (offer.kind !== "REAL_VERIFIED" || !proven(offer.evidence)) {
        eligibility = "SCENARIO_ONLY";
      } else if (!referenceQualityProven) {
        eligibility = "REFERENCE_UNVERIFIED";
      } else if (offer.access.billingMode !== preferences.billingMode ||
        reference.access.billingMode !== preferences.billingMode) {
        eligibility = "BILLING_MODE_MISMATCH";
      } else if (offer.executionEnvironment !== reference.executionEnvironment) {
        eligibility = "ENVIRONMENT_MISMATCH";
      } else if (!accessRuntimeCompatible(offer)) {
        eligibility = "ACCESS_RUNTIME_MISMATCH";
      } else if (offer.campaign.workloadId !== refCampaign.workloadId ||
        offer.campaign.workloadDomain !== refCampaign.workloadDomain ||
        offer.campaign.successDefinitionId !== refCampaign.successDefinitionId) {
        eligibility = "WORKLOAD_MISMATCH";
      } else if (offer.quality !== "PASS") {
        eligibility = offer.quality === "FAIL" ? "QUALITY_INSUFFICIENT" : "QUALITY_UNPROVEN";
      } else if (!validCampaign(offer.campaign)) {
        eligibility = "PRICE_UNKNOWN";
      } else if (offer.access.billingMode === "SUBSCRIPTION" &&
        !subscribedReasoningVerified(offer)) {
        eligibility = offer.access.subscriptionPlanAvailability === "UNAVAILABLE"
          ? "SUBSCRIPTION_PLAN_UNAVAILABLE" : "SUBSCRIPTION_ACCESS_UNPROVEN";
      } else if (comparableCoding(reference, offer) === "REASONING_UNPROVEN") {
        eligibility = "REASONING_CONFIGURATION_UNPROVEN";
      } else if (comparableCoding(reference, offer) === "MISMATCH") {
        eligibility = "CODING_PROFILE_MISMATCH";
      } else if (comparableCoding(reference, offer) === "FAIL") {
        eligibility = "QUALITY_INSUFFICIENT";
      } else if (comparableCoding(reference, offer) !== "PASS") {
        eligibility = "QUALITY_UNPROVEN";
      } else if (refSuccessRate !== null &&
        offer.campaign.successfulTasks / offer.campaign.attemptedTasks +
          MAX_SUCCESS_RATE_DROP_ABSOLUTE < refSuccessRate - 1e-12) {
        eligibility = "QUALITY_INSUFFICIENT";
      } else if (offer.capabilities !== "PASS") {
        eligibility = offer.capabilities === "FAIL" ? "CAPABILITIES_INSUFFICIENT" : "CAPABILITIES_UNPROVEN";
      } else if (offer.privacy !== "PASS") {
        eligibility = "PRIVACY_BLOCKED";
      } else if (offer.availability !== "PASS") {
        eligibility = offer.availability === "FAIL" ? "UNAVAILABLE" : "AVAILABILITY_UNPROVEN";
      } else if (price === null || refCap === null || refPrice === null) {
        eligibility = "PRICE_UNKNOWN";
      } else if (offer.campaign.price?.scope !== refCampaign.price?.scope ||
        (preferences.billingMode === "SUBSCRIPTION" &&
          offer.campaign.price?.subscriptionAttribution?.periodId !==
            refCampaign.price?.subscriptionAttribution?.periodId)) {
        eligibility = "COST_BOUNDARY_MISMATCH";
      } else if (lessOrEqualWithFloatingSafety(price.max, refCap)) {
        eligibility = "ELIGIBLE_PRICE";
      } else if (price.min > refPrice.max * MAX_PRICE_MULTIPLIER) {
        eligibility = "OVER_PRICE_CAP";
      } else {
        eligibility = "PRICE_ELIGIBILITY_UNCERTAIN";
      }
    } else {
      eligibility = "BASELINE";
    }

    if (energy !== null && refEnergy !== null &&
      offer.campaign.energy?.boundary !== refCampaign.energy?.boundary) {
      warnings.push("ENERGY_BOUNDARY_MISMATCH");
    }
    if (carbon !== null && refCarbon !== null &&
      offer.campaign.operationalCarbon?.accountingMethodId !==
        refCampaign.operationalCarbon?.accountingMethodId) {
      carbon = null;
      warnings.push("CARBON_ACCOUNTING_MISMATCH");
    }
    if (price === null) warnings.push("PRICE_UNKNOWN");
    if (energy === null) warnings.push("ENERGY_UNKNOWN");
    if (carbon === null) warnings.push("CARBON_UNKNOWN_OR_NOT_COMPARABLE");
    if (!isSingleExact(price)) warnings.push("PRICE_HAS_INTERVAL_OR_IS_UNKNOWN");
    if (!isSingleExact(carbon)) warnings.push("CARBON_HAS_INTERVAL_OR_IS_UNKNOWN");

    evaluated.push({
      offer, eligibility, priceEuroPerSuccess: price,
      energyWhPerSuccess: energy, carbonGramsCo2ePerSuccess: carbon,
      platformContinuityPreferred: false,
      canPlot: (first ? referenceQualityProven : eligibility === "ELIGIBLE_PRICE") &&
        isSingleExact(price) && isSingleExact(carbon) &&
        offer.kind === "REAL_VERIFIED" && proven(offer.evidence),
      warnings,
    });
  }

  const nearTie = (a: EvaluatedOffer, b: EvaluatedOffer): boolean => {
    const ac = a.priceEuroPerSuccess, bc = b.priceEuroPerSuccess;
    const ae = a.carbonGramsCo2ePerSuccess, be = b.carbonGramsCo2ePerSuccess;
    return isSingleExact(ac) && isSingleExact(bc) && isSingleExact(ae) && isSingleExact(be) &&
      ac.min <= bc.min * MAX_PLATFORM_NEAR_TIE &&
      ae.min <= be.min * MAX_PLATFORM_NEAR_TIE;
  };
  const withPreference: EvaluatedOffer[] = evaluated.map((item) => ({
    ...item,
    platformContinuityPreferred: item.eligibility === "ELIGIBLE_PRICE" &&
      eligibleForSameSubscriptionPlatform(item.offer, preferences) &&
      evaluated.some((other) => other.eligibility === "ELIGIBLE_PRICE" &&
        !eligibleForSameSubscriptionPlatform(other.offer, preferences) && nearTie(item, other)),
  }));
  const rawPoints = withPreference.filter((item) => item.canPlot).map((item) => ({
    id: item.offer.id,
    name: item.offer.name,
    xEuroPerSuccess: item.priceEuroPerSuccess!.min,
    yGramsCo2ePerSuccess: item.carbonGramsCo2ePerSuccess!.min,
    isReference: item.eligibility === "BASELINE",
    platformContinuityPreferred: item.platformContinuityPreferred,
  }));
  const onFront = new Set(priceCarbonPareto(rawPoints));
  return {
    referenceId: reference.id,
    preferences,
    maxCostMultiplier: MAX_PRICE_MULTIPLIER,
    robustPriceCapEuroPerSuccess: refCap,
    offers: withPreference,
    plotPoints: rawPoints.map((point) => ({
      ...point,
      onPriceCarbonParetoFront: onFront.has(point.id),
    })),
  };
}
