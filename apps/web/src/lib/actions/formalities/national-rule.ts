import type {
  ActionFormality,
  ActionFormalitiesFacts,
  FormalitiesOfficialSource,
  FormalityRequirementStatus,
} from "./qualification";
import type {
  AdministrativeFormalityRule,
  AdministrativeRuleContract,
} from "./rules";

const NATIONAL_FORMALITIES_RULESET_VERSION =
  "national-administrative-framework-2026-11-27" as const;
const NATIONAL_FORMALITIES_RULE_ID = "national-formalities-fallback" as const;

function buildNationalUnknownFormality(
  source: FormalitiesOfficialSource,
): ActionFormality {
  return {
    id: NATIONAL_FORMALITIES_RULE_ID,
    requirementStatus: "unknown",
    procedureKind: "unknown",
    competentAuthority: {
      kind: "unknown",
      label: "Autorité compétente à identifier",
    },
    recipient: null,
    source,
    supportingSources: [],
    scope: "Cadre national français — règle locale à vérifier",
    justification:
      "Le cadre national officiel est disponible, mais CleanMyMap ne dispose pas encore d’une règle locale suffisamment vérifiée pour cette action.",
    deadline: null,
    officialChannel: null,
    requestedInformation: [],
    requestedDocuments: [],
  };
}

export function createNationalFormalitiesRule(params: {
  source: FormalitiesOfficialSource;
  verifiedOn: string;
}): AdministrativeFormalityRule {
  const contract: AdministrativeRuleContract = {
    authority: {
      kind: "unknown",
      label: "Autorité compétente à identifier localement",
    },
    requirementStatus: "unknown" satisfies FormalityRequirementStatus,
    procedureKind: "unknown",
    officialSource: params.source,
    verifiedAt: params.verifiedOn,
    deadline: null,
    destination: null,
    requiredInformation: [],
  };

  return {
    id: NATIONAL_FORMALITIES_RULE_ID,
    scope: { kind: "national", countryCode: "FR" },
    rulesetVersion: NATIONAL_FORMALITIES_RULESET_VERSION,
    contract,
    qualifies: (facts) => ({
      formalities: [buildNationalUnknownFormality(params.source), ...qualifyNationalObligations(facts, params.source)],
      unresolvedQuestions: ["règle locale applicable sur le territoire"],
    }),
  };
}

const PUBLIC_DOMAIN_SOURCE: FormalitiesOfficialSource = {
  id: "cg3p-l2122-1",
  title: "Code général de la propriété des personnes publiques, article L2122-1",
  authorityLevel: "national",
  url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000034448110/",
  verifiedOn: "2026-11-27",
  scope: "Occupation ou utilisation du domaine public dépassant le droit d'usage appartenant à tous.",
};

function qualifyNationalObligations(
  facts: ActionFormalitiesFacts,
  source: FormalitiesOfficialSource,
): ActionFormality[] {
  // Never infer an obligation from an unlocated action or a simple cleaning walk.
  if (facts.territory.jurisdictionEvidence !== "metropolitan_point") return [];
  const result: ActionFormality[] = [];
  if (
    facts.isPublicRoadwayActivity === true &&
    (facts.isCortegeOrGathering === true || facts.isClaiming === true) &&
    facts.localCustomaryUse === false
  ) {
    result.push({
      ...buildNationalUnknownFormality(source),
      id: "national-public-roadway-declaration",
      requirementStatus: "required",
      procedureKind: "police_declaration",
      competentAuthority: { kind: "unknown", label: "Mairie ou préfecture compétente à identifier" },
      scope: "Manifestation caractérisée sur la voie publique, hors exception d'usage local.",
      justification: "Le régime général de déclaration préalable s’applique aux manifestations caractérisées sur la voie publique (CSI L211-1 et L211-2). Cas général : entre 3 et 15 jours francs ; vérifier les règles territoriales particulières.",
      deadline: null, // Local exceptions and clear-day computation must be confirmed.
      officialChannel: { kind: "official_page", label: "Identifier la démarche et l'autorité compétente", url: source.url },
      requestedInformation: ["organisateurs", "objet, date, lieu et horaires", "itinéraire éventuel", "effectif et sécurité"],
    });
  }
  if (facts.publicSpace === "public_domain" && facts.requiresPhysicalOccupation === true) {
    result.push({
      ...buildNationalUnknownFormality(PUBLIC_DOMAIN_SOURCE),
      id: "national-public-domain-occupation-title",
      requirementStatus: "required",
      procedureKind: "city_aot",
      competentAuthority: { kind: "other_manager", label: "Gestionnaire effectif du domaine public" },
      scope: "Occupation du domaine public au-delà de l'usage commun.",
      justification: "L'article L2122-1 exige un titre pour cette occupation. Le gestionnaire, le formulaire et les délais locaux restent à confirmer.",
      officialChannel: { kind: "manager_to_confirm", label: "Demander le titre au gestionnaire compétent", url: null },
      requestedInformation: ["gestionnaire effectif", "emprise, dates et horaires", "conditions d'occupation"],
    });
  }
  return result;
}
