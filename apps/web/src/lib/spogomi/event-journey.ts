export type SpogomiJourneyStatus = "todo" | "pending" | "validated" | "later" | "access_required" | "indeterminate";

export type SpogomiJourneyStepKey =
  | "quiz"
  | "registration"
  | "admission"
  | "identity"
  | "team"
  | "practical"
  | "results"
  | "contributions"
  | "attestations";

export type SpogomiJourneyStep = {
  key: SpogomiJourneyStepKey;
  title: string;
  description: string;
  status: SpogomiJourneyStatus;
  href: string | null;
};

export type SpogomiAuthorizedSpace = {
  key: "organizer" | "referee";
  title: string;
  description: string;
  href: string;
};

export type SpogomiEventJourney = {
  next: SpogomiJourneyStep;
  steps: readonly SpogomiJourneyStep[];
  authorizedSpaces: readonly SpogomiAuthorizedSpace[];
};

export type SpogomiEventJourneyInput = {
  isAuthenticated: boolean;
  lifecycle: "upcoming" | "in_progress" | "finished" | "cancelled" | "postponed";
  registrationStatus: "not_open" | "open" | "closed" | "capacity_reached";
  directRegistrationAvailable: boolean;
  activeRegistrationRequest?: boolean;
  resultsStatus: "unavailable" | "provisional" | "certified" | "published";
  quizStatus: "passed" | "missing" | "unavailable";
  admissionStatus: "pending" | "approved" | "rejected" | "cancelled" | "none" | "unavailable";
  identityStatus: "identity_unlinked" | "identity_verified" | "participation_pending" | "participation_confirmed" | "participation_cancelled" | "unavailable";
  teamLinked: boolean;
  privateProofStatus: "available" | "unavailable";
  hasCertifiedMission: boolean;
  hasActiveAttestation: boolean;
  organizerSpaceHref: string | null;
  refereeSpaceHref: string | null;
  refereeCapabilities: readonly ("attendance" | "operations" | "arbitration" | "results")[];
  signInHref: string;
  signInHrefByStep?: Partial<Record<SpogomiJourneyStepKey, string>>;
};

export function journeyStatusLabel(status: SpogomiJourneyStatus): string {
  if (status === "todo") return "À faire";
  if (status === "pending") return "En attente";
  if (status === "validated") return "Validée";
  if (status === "later") return "Plus tard";
  if (status === "access_required") return "Accès requis";
  return "Indéterminé";
}

function sportsHref(input: SpogomiEventJourneyInput, key: SpogomiJourneyStepKey, anchor: string): string {
  return input.isAuthenticated ? anchor : input.signInHrefByStep?.[key] ?? input.signInHref;
}

function buildSteps(input: SpogomiEventJourneyInput): SpogomiJourneyStep[] {
  const quizStatus: SpogomiJourneyStatus = !input.isAuthenticated
    ? "access_required"
    : input.quizStatus === "passed" ? "validated" : input.quizStatus === "unavailable" ? "indeterminate" : "todo";
  const admissionStatus: SpogomiJourneyStatus = !input.isAuthenticated
    ? "access_required"
    : input.admissionStatus === "pending" ? "pending"
      : input.admissionStatus === "approved" ? "validated"
        : input.admissionStatus === "unavailable" ? "indeterminate"
          : input.lifecycle === "finished" || input.lifecycle === "cancelled" ? "later"
            : "todo";
  const registrationStatus: SpogomiJourneyStatus = !input.isAuthenticated
    ? "access_required"
    : input.lifecycle === "in_progress" && input.admissionStatus !== "pending" && input.admissionStatus !== "approved" ? "todo"
      : input.admissionStatus === "pending" ? "pending"
        : input.admissionStatus === "approved" ? "validated"
        : input.quizStatus === "unavailable" ? "indeterminate"
      : input.quizStatus !== "passed" ? "later"
            : input.registrationStatus === "open" && input.directRegistrationAvailable && !input.activeRegistrationRequest ? "todo" : "later";
  const identityStatus: SpogomiJourneyStatus = !input.isAuthenticated
    ? "access_required"
    : input.admissionStatus !== "approved" ? "later"
      : input.identityStatus === "identity_unlinked" ? "todo"
        : input.identityStatus === "unavailable" ? "indeterminate" : "validated";
  const teamStatus: SpogomiJourneyStatus = !input.isAuthenticated
    ? "access_required"
    : input.admissionStatus !== "approved" || input.identityStatus === "identity_unlinked" ? "later"
      : input.teamLinked ? "validated" : input.identityStatus === "unavailable" ? "indeterminate" : "todo";
  const practicalStatus: SpogomiJourneyStatus = input.lifecycle === "cancelled" ? "later" : "todo";
  const resultsStatus: SpogomiJourneyStatus = input.lifecycle !== "finished"
    ? "later"
    : input.resultsStatus === "published" || input.resultsStatus === "certified" || input.resultsStatus === "provisional" ? "todo" : "indeterminate";
  const contributionsStatus: SpogomiJourneyStatus = input.lifecycle !== "finished"
    ? "later"
    : input.privateProofStatus === "unavailable" ? "indeterminate"
      : input.hasCertifiedMission ? "todo" : "later";
  const attestationsStatus: SpogomiJourneyStatus = input.lifecycle !== "finished"
    ? "later"
    : input.privateProofStatus === "unavailable" ? "indeterminate"
      : input.hasActiveAttestation ? "todo" : "later";

  return [
    { key: "quiz", title: "Valider le quiz obligatoire", description: "Lire le règlement applicable puis répondre au quiz de la division et à sa version en vigueur.", status: input.lifecycle === "in_progress" ? "later" : quizStatus, href: input.lifecycle === "in_progress" ? null : sportsHref(input, "quiz", "#spogomi-sports-registration") },
    { key: "registration", title: input.lifecycle === "in_progress" ? "Signaler une présence à régulariser" : "Demander son inscription sportive", description: input.lifecycle === "in_progress" ? "Transmettre une régularisation de présence pendant l’épreuve." : "Envoyer une nouvelle demande uniquement après validation du quiz et si les inscriptions sont autorisées.", status: registrationStatus, href: sportsHref(input, "registration", "#spogomi-sports-registration") },
    { key: "admission", title: "Suivre sa demande d’admission", description: "La décision de l’organisation ne réserve pas de place et reste distincte du rattachement à une équipe.", status: admissionStatus, href: sportsHref(input, "admission", "#spogomi-sports-registration") },
    { key: "identity", title: "Rattacher son compte", description: "Saisir le code individuel remis par l’organisation lorsque l’admission est vérifiée.", status: identityStatus, href: sportsHref(input, "identity", "#spogomi-identity") },
    { key: "team", title: "Rejoindre ou retrouver son équipe", description: "Utiliser une équipe publiée ou une invitation autorisée ; le roster reste privé.", status: teamStatus, href: sportsHref(input, "team", "#spogomi-teams") },
    { key: "practical", title: "Lire les informations pratiques", description: "Retrouver le lieu, les horaires, le parcours et les consignes vérifiées avant l’épreuve.", status: practicalStatus, href: "#spogomi-practical-information" },
    { key: "results", title: "Consulter les résultats publics", description: "Accéder uniquement aux classements effectivement publiés par l’organisation.", status: resultsStatus, href: "#spogomi-public-results" },
    { key: "contributions", title: "Consulter ses contributions", description: "Voir les missions rattachées au compte lorsqu’elles sont certifiées par une preuve serveur.", status: contributionsStatus, href: sportsHref(input, "contributions", "#spogomi-contributions") },
    { key: "attestations", title: "Télécharger ses attestations", description: "Télécharger une attestation seulement lorsqu’une certification active existe.", status: attestationsStatus, href: sportsHref(input, "attestations", "#spogomi-contributions") },
  ];
}

function nextCompetitorStep(input: SpogomiEventJourneyInput, steps: readonly SpogomiJourneyStep[]): SpogomiJourneyStep {
  const byKey = new Map(steps.map((step) => [step.key, step]));
  if (input.lifecycle === "cancelled") return byKey.get("practical")!;
  if (input.lifecycle === "finished") {
    return (["results", "contributions", "attestations", "practical"] as const).map((key) => byKey.get(key)!).find((step) => step.status === "todo" || step.status === "indeterminate") ?? byKey.get("practical")!;
  }
  if (input.admissionStatus === "pending") return byKey.get("admission")!;
  if (input.admissionStatus === "approved" && input.identityStatus === "identity_unlinked") return byKey.get("identity")!;
  if (input.admissionStatus === "approved" && !input.teamLinked) return byKey.get("team")!;
  if (input.lifecycle === "in_progress") return byKey.get("registration")!;
  if (!input.isAuthenticated) return byKey.get("quiz")!;
  if (input.quizStatus !== "passed") return byKey.get("quiz")!;
  if (!input.activeRegistrationRequest && ["none", "rejected", "cancelled"].includes(input.admissionStatus) && input.registrationStatus === "open" && input.directRegistrationAvailable) return byKey.get("registration")!;
  if (["none", "rejected", "cancelled"].includes(input.admissionStatus) && input.registrationStatus !== "open") return byKey.get("practical")!;
  return byKey.get("practical")!;
}

function buildAuthorizedSpaces(input: SpogomiEventJourneyInput): SpogomiAuthorizedSpace[] {
  const spaces: SpogomiAuthorizedSpace[] = [];
  if (input.organizerSpaceHref) {
    spaces.push({ key: "organizer", title: "Préparer et gérer l’édition", description: "Ouvrir le cockpit organisateur et poursuivre la section prioritaire selon l’état réel de l’édition.", href: input.organizerSpaceHref });
  }
  if (input.refereeSpaceHref && input.refereeCapabilities.length) {
    const capabilityLabel = input.refereeCapabilities.includes("operations") ? "opérations terrain" : input.refereeCapabilities.includes("arbitration") ? "arbitrage" : input.refereeCapabilities.includes("attendance") ? "présences" : "résultats";
    spaces.push({ key: "referee", title: `Ouvrir les ${capabilityLabel} autorisées`, description: "L’accès est borné à cette édition et aux habilitations actives ; aucune capacité n’est déduite de l’interface.", href: input.refereeSpaceHref });
  }
  return spaces;
}

export function buildSpogomiEventJourney(input: SpogomiEventJourneyInput): SpogomiEventJourney {
  const steps = buildSteps(input);
  return { next: nextCompetitorStep(input, steps), steps, authorizedSpaces: buildAuthorizedSpaces(input) };
}
