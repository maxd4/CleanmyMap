/**
 * Explainable qualification of local administrative formalities.
 *
 * This module qualifies facts supplied by the workflow. It does not submit a
 * dossier, block an action, or assert a duty that the cited official sources
 * do not establish.
 */

export const ACTION_FORMALITIES_SCHEMA_VERSION =
  "action-formalities-qualification-v1" as const;
export const PARIS_FORMALITIES_RULESET_VERSION =
  "paris-public-space-formalities-2026-04-16" as const;
export const PARIS_TERRITORY_CODE = "FR-75" as const;
export const FORMALITIES_RULE_VERIFIED_ON = "2026-09-17" as const;

export type FormalityRequirementStatus =
  | "required"
  | "recommended"
  | "not_required"
  | "unknown";

export type FormalityProcedureKind =
  | "city_aot"
  | "police_declaration"
  | "other_manager"
  | "information_only"
  | "none"
  | "unknown";

export type FormalitiesAuthorityKind =
  | "paris_city"
  | "police_prefecture"
  | "other_manager"
  | "unknown";

export type FormalitiesTerritory = {
  countryCode: "FR";
  code: string;
  label: string;
};

export type FormalitiesOfficialSource = {
  id: string;
  title: string;
  authorityLevel: "municipal" | "police" | "national";
  url: string;
  verifiedOn: typeof FORMALITIES_RULE_VERIFIED_ON;
  scope: string;
};

export type FormalitiesOfficialChannel = {
  kind: "official_page" | "official_platform" | "official_email" | "manager_to_confirm";
  label: string;
  url: string | null;
  /** Only populated when the source explicitly proves an official email channel. */
  emailAddress?: string | null;
};

export type FormalitiesDeadline = {
  minimumValue: number;
  unit: "days" | "months";
  note: string;
};

export type ActionFormality = {
  id: string;
  requirementStatus: FormalityRequirementStatus;
  procedureKind: FormalityProcedureKind;
  competentAuthority: {
    kind: FormalitiesAuthorityKind;
    label: string;
  };
  recipient: string | null;
  source: FormalitiesOfficialSource | null;
  supportingSources: FormalitiesOfficialSource[];
  scope: string;
  justification: string;
  deadline: FormalitiesDeadline | null;
  officialChannel: FormalitiesOfficialChannel | null;
  requestedInformation: string[];
  requestedDocuments: string[];
};

export type FormalitiesBoolean = boolean | "unknown";

export type ActionFormalitiesFacts = {
  territory: FormalitiesTerritory;
  publicSpace: "public_domain" | "private_domain" | "unknown";
  manager: {
    kind:
      | "paris_city"
      | "state"
      | "sncf"
      | "haropa"
      | "other_public"
      | "private"
      | "unknown";
    label: string | null;
  };
  isCleanwalk: boolean;
  isPublicRoadwayActivity: FormalitiesBoolean;
  isItinerant: FormalitiesBoolean;
  isClaiming: FormalitiesBoolean;
  hasInstallations: FormalitiesBoolean;
  requiresPhysicalOccupation: FormalitiesBoolean;
  localCustomaryUse: FormalitiesBoolean;
  largeCrowdOrComplexInstallations: FormalitiesBoolean;
};

export type ActionFormalitiesQualification = {
  schemaVersion: typeof ACTION_FORMALITIES_SCHEMA_VERSION;
  rulesetVersion: string | null;
  territory: FormalitiesTerritory;
  formalities: ActionFormality[];
  unresolvedQuestions: string[];
};

const CITY_EVENTS_SOURCE: FormalitiesOfficialSource = {
  id: "ville-paris-evenements-espace-public-33659",
  title: "Demande d'organisation d'événements dans l’espace public",
  authorityLevel: "municipal",
  url: "https://www.paris.fr/pages/evenements-dans-l-espace-public-33659",
  verifiedOn: FORMALITIES_RULE_VERIFIED_ON,
  scope:
    "Domaine public municipal parisien, événements, AOT, gestionnaires exclus et manifestations déambulatoires sans installations.",
};

const SERVICE_PUBLIC_MANIFESTATION_SOURCE: FormalitiesOfficialSource = {
  id: "service-public-manifestation-voie-publique-f21899",
  title: "Organisation de manifestations, défilés ou rassemblements sur la voie publique",
  authorityLevel: "national",
  url: "https://www.service-public.gouv.fr/particuliers/vosdroits/F21899",
  verifiedOn: FORMALITIES_RULE_VERIFIED_ON,
  scope:
    "Cadre national des déclarations préalables, avec les délais et le régime particulier de Paris.",
};

const POLICE_MANIFESTATION_SOURCE: FormalitiesOfficialSource = {
  id: "prefecture-police-manifestation-paris-espace-public",
  title: "Manifestation sur la voie publique ou tout espace ouvert au public à Paris",
  authorityLevel: "police",
  url: "https://www.prefecturedepolice.interieur.gouv.fr/demarches/manifestation-sur-la-voie-publique-ou-tout-espace-ouvert-au-public",
  verifiedOn: FORMALITIES_RULE_VERIFIED_ON,
  scope:
    "Page de démarche de la Préfecture de police de Paris, référencée par Service-Public pour les manifestations parisiennes.",
};

const POLICE_CHANNEL: FormalitiesOfficialChannel = {
  kind: "official_platform",
  label: "Déclaration et demande d'autorisation de manifestations",
  url: "https://declaration-manifestations.gouv.fr/",
};

const CITY_CHANNEL: FormalitiesOfficialChannel = {
  kind: "official_page",
  label: "Page officielle de demande d'événements dans l'espace public",
  url: CITY_EVENTS_SOURCE.url,
};

const UNKNOWN_CHANNEL: FormalitiesOfficialChannel = {
  kind: "manager_to_confirm",
  label: "Canal à confirmer auprès du gestionnaire compétent",
  url: null,
};

const CITY_AOT_INFORMATION = [
  "nom et coordonnées des organisateurs",
  "identité de la structure",
  "nature et descriptif de l'opération",
  "localisation pressentie",
  "dates et horaires, montage et démontage compris",
  "estimatif du public attendu",
];

const CITY_AOT_DOCUMENTS = [
  "lettre d'intention signée",
  "extrait Kbis pour une société ou numéro RNA pour une association",
  "plan d'implantation et fiche technique des structures",
];

const POLICE_INFORMATION = [
  "coordonnées de l'association et de son représentant légal, le cas échéant",
  "nom, prénom, adresse et moyens de contact des organisateurs",
  "objet, lieux, date et heures de début et de fin",
  "itinéraire lorsque la manifestation implique un déplacement",
  "estimation du nombre de participants",
  "dispositifs de sécurité et particularités de la manifestation",
];

function buildUnknownFormality(
  id: string,
  source: FormalitiesOfficialSource | null,
  scope: string,
  justification: string,
): ActionFormality {
  return {
    id,
    requirementStatus: "unknown",
    procedureKind: "unknown",
    competentAuthority: {
      kind: "unknown",
      label: "Autorité compétente à identifier",
    },
    recipient: null,
    source,
    supportingSources: [],
    scope,
    justification,
    deadline: null,
    officialChannel: null,
    requestedInformation: [],
    requestedDocuments: [],
  };
}

function buildCityAotFormality(): ActionFormality {
  return {
    id: "paris-city-public-domain-aot",
    requirementStatus: "required",
    procedureKind: "city_aot",
    competentAuthority: {
      kind: "paris_city",
      label: "Ville de Paris — domaine public municipal",
    },
    recipient: "Service des événements de la Ville de Paris",
    source: CITY_EVENTS_SOURCE,
    supportingSources: [],
    scope:
      "Événement occupant le domaine public municipal parisien avec installation ou emprise physique.",
    justification:
      "La Ville de Paris décrit une AOT préalable pour les manifestations événementielles accueillies sur son domaine public et instruit le dossier technique.",
    deadline: {
      minimumValue: 2,
      unit: "months",
      note: "Délai minimal indiqué par la Ville avant le premier jour d'occupation du domaine public.",
    },
    officialChannel: CITY_CHANNEL,
    requestedInformation: CITY_AOT_INFORMATION,
    requestedDocuments: CITY_AOT_DOCUMENTS,
  };
}

function buildPoliceFormality(
  largeCrowdOrComplexInstallations: FormalitiesBoolean,
): ActionFormality {
  const usesLongerDeadline = largeCrowdOrComplexInstallations === true;
  return {
    id: "paris-police-public-roadway-declaration",
    requirementStatus: "required",
    procedureKind: "police_declaration",
    competentAuthority: {
      kind: "police_prefecture",
      label: "Préfecture de police de Paris",
    },
    recipient: "Préfet de police de Paris",
    source: POLICE_MANIFESTATION_SOURCE,
    supportingSources: [SERVICE_PUBLIC_MANIFESTATION_SOURCE],
    scope:
      "Cortège, défilé, rassemblement ou manifestation sur la voie publique à Paris, y compris les cas revendicatifs ou déambulatoires sans installations.",
    justification:
      "À Paris, Service-Public indique une déclaration préalable pour tout cortège, défilé, rassemblement ou manifestation sur la voie publique ; la Ville renvoie exclusivement à la Préfecture de police les manifestations revendicatives ou uniquement déambulatoires sans installations.",
    deadline: {
      minimumValue: usesLongerDeadline ? 3 : 1,
      unit: "months",
      note: usesLongerDeadline
        ? "Le délai est porté au minimum à trois mois en cas de foule importante ou d'installations complexes."
        : "Délai parisien minimal indiqué pour une manifestation sur la voie publique ; une durée supérieure peut s'appliquer selon les faits.",
    },
    officialChannel: POLICE_CHANNEL,
    requestedInformation: POLICE_INFORMATION,
    requestedDocuments: ["déclaration signée par au moins un organisateur"],
  };
}

function buildOtherManagerFormality(
  managerLabel: string | null,
): ActionFormality {
  return {
    id: "non-municipal-public-domain-manager-authorization",
    requirementStatus: "required",
    procedureKind: "other_manager",
    competentAuthority: {
      kind: "other_manager",
      label: managerLabel
        ? `Gestionnaire du lieu — ${managerLabel}`
        : "Gestionnaire du lieu à identifier",
    },
    recipient: managerLabel,
    source: CITY_EVENTS_SOURCE,
    supportingSources: [],
    scope:
      "Domaine ou espace ouvert au public exclu du domaine municipal parisien, avec occupation ou installation.",
    justification:
      "La Ville de Paris précise que les domaines de l'État, de la SNCF, d'HAROPA et d'autres propriétaires ou gestionnaires sont exclus et que la demande doit être adressée directement au gestionnaire concerné.",
    deadline: null,
    officialChannel: UNKNOWN_CHANNEL,
    requestedInformation: [
      "gestionnaire exact du lieu",
      "règles, délai et canal propres au site",
    ],
    requestedDocuments: [],
  };
}

function buildLocalCustomaryUseExemption(): ActionFormality {
  return {
    id: "local-customary-public-roadway-outing",
    requirementStatus: "not_required",
    procedureKind: "none",
    competentAuthority: {
      kind: "unknown",
      label: "Aucune autorité de déclaration identifiée pour ce cas précis",
    },
    recipient: null,
    source: SERVICE_PUBLIC_MANIFESTATION_SOURCE,
    supportingSources: [],
    scope: "Sortie sur la voie publique conforme aux usages locaux.",
    justification:
      "Service-Public indique que les sorties conformes aux usages locaux sont dispensées de déclaration préalable. Cette exception ne doit pas être appliquée automatiquement à une cleanwalk.",
    deadline: null,
    officialChannel: null,
    requestedInformation: [],
    requestedDocuments: [],
  };
}

function buildManagerIdentificationRecommendation(): ActionFormality {
  return {
    id: "identify-public-space-manager",
    requirementStatus: "recommended",
    procedureKind: "information_only",
    competentAuthority: {
      kind: "unknown",
      label: "Gestionnaire du lieu à identifier",
    },
    recipient: null,
    source: CITY_EVENTS_SOURCE,
    supportingSources: [],
    scope: "Espace public parisien dont le propriétaire ou gestionnaire n'est pas établi.",
    justification:
      "La Ville distingue son domaine public des domaines de l'État, de la SNCF et des autres gestionnaires ; identifier le gestionnaire est nécessaire avant de conclure sur la formalité applicable.",
    deadline: null,
    officialChannel: UNKNOWN_CHANNEL,
    requestedInformation: ["propriétaire ou gestionnaire effectif du lieu"],
    requestedDocuments: [],
  };
}

function qualifyParisFormalities(
  facts: ActionFormalitiesFacts,
): ActionFormalitiesQualification {
  const formalities: ActionFormality[] = [];
  const unresolvedQuestions: string[] = [];
  const hasPublicDomainFacts = facts.publicSpace === "public_domain";
  const hasCityOccupation =
    hasPublicDomainFacts &&
    facts.manager.kind === "paris_city" &&
    (facts.hasInstallations === true || facts.requiresPhysicalOccupation === true);
  const hasPoliceManifestation =
    hasPublicDomainFacts &&
    (facts.isPublicRoadwayActivity === true ||
      facts.isClaiming === true ||
      (facts.isItinerant === true && facts.hasInstallations === false));
  const hasOtherManagerOccupation =
    hasPublicDomainFacts &&
    facts.manager.kind !== "paris_city" &&
    facts.manager.kind !== "unknown" &&
    (facts.hasInstallations === true || facts.requiresPhysicalOccupation === true);

  if (hasPublicDomainFacts && facts.manager.kind === "unknown") {
    formalities.push(buildManagerIdentificationRecommendation());
    unresolvedQuestions.push("gestionnaire effectif du lieu");
  }

  if (hasCityOccupation) formalities.push(buildCityAotFormality());
  if (hasPoliceManifestation) {
    formalities.push(
      buildPoliceFormality(facts.largeCrowdOrComplexInstallations),
    );
  }
  if (hasOtherManagerOccupation) {
    formalities.push(buildOtherManagerFormality(facts.manager.label));
  }

  if (
    hasPublicDomainFacts &&
    facts.localCustomaryUse === true &&
    !hasCityOccupation &&
    !hasPoliceManifestation &&
    !hasOtherManagerOccupation
  ) {
    formalities.push(buildLocalCustomaryUseExemption());
  }

  const hasDeterminativeFormality = formalities.some(
    (formality) => formality.requirementStatus !== "recommended",
  );
  if (!hasDeterminativeFormality) {
    formalities.push(
      buildUnknownFormality(
        "paris-formality-scope-undetermined",
        facts.publicSpace === "public_domain"
          ? SERVICE_PUBLIC_MANIFESTATION_SOURCE
          : null,
        facts.isCleanwalk
          ? "Cleanwalk parisienne sans installation dont la forme juridique et l'occupation effective ne sont pas suffisamment caractérisées."
          : "Action parisienne dont les faits ne permettent pas encore de sélectionner une formalité.",
        facts.isCleanwalk
          ? "Les sources officielles consultées ne créent pas une AOT automatique pour une simple cleanwalk et ne suffisent pas, sans autres faits, à conclure à une exemption ou à une déclaration précise."
          : "Aucune règle officielle suffisamment précise n'est applicable aux faits fournis.",
      ),
    );
    unresolvedQuestions.push("forme et occupation exacte de l'action");
  } else if (
    facts.publicSpace === "unknown" ||
    facts.hasInstallations === "unknown" ||
    facts.isPublicRoadwayActivity === "unknown"
  ) {
    unresolvedQuestions.push("faits manquants sur le lieu, l'installation ou la manifestation");
  }

  return {
    schemaVersion: ACTION_FORMALITIES_SCHEMA_VERSION,
    rulesetVersion: PARIS_FORMALITIES_RULESET_VERSION,
    territory: facts.territory,
    formalities,
    unresolvedQuestions: [...new Set(unresolvedQuestions)],
  };
}

const TERRITORIAL_QUALIFIERS: Record<
  string,
  (facts: ActionFormalitiesFacts) => ActionFormalitiesQualification
> = {
  [PARIS_TERRITORY_CODE]: qualifyParisFormalities,
};

export function qualifyActionFormalities(
  facts: ActionFormalitiesFacts,
): ActionFormalitiesQualification {
  const qualifier = TERRITORIAL_QUALIFIERS[facts.territory.code];
  if (qualifier) return qualifier(facts);

  return {
    schemaVersion: ACTION_FORMALITIES_SCHEMA_VERSION,
    rulesetVersion: null,
    territory: facts.territory,
    formalities: [
      buildUnknownFormality(
        "territory-formality-ruleset-unavailable",
        null,
        "Territoire non couvert par un jeu de règles officiel intégré.",
        "Le moteur ne généralise pas la règle parisienne à un autre territoire sans source officielle et règleset dédié.",
      ),
    ],
    unresolvedQuestions: ["règles officielles du territoire"],
  };
}
