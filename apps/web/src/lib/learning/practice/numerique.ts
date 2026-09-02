import type {
  ContentClaim,
  ContentLocalizedText,
  ContentValidationRecord,
} from "@/lib/content/content-validation";

export type NumeriqueLocalizedText = {
  fr: string;
  en: string;
};

export type NumeriqueTutorialStep = {
  id: string;
  title: NumeriqueLocalizedText;
  instruction: NumeriqueLocalizedText;
  detail: NumeriqueLocalizedText;
};

export type NumeriqueSource = {
  id: string;
  name: string;
  url: string;
  label: NumeriqueLocalizedText;
};

/** Facteurs repris des pages Impact CO₂ qui citent la Base Empreinte ADEME. */
export const NUMERIQUE_CO2_FACTORS = {
  unreadSpamGramsPerEmail: 3.74,
  cloudStorageGramsPerGbYear: 0.24,
  averagePetrolCarGramsPerKm: 170,
} as const;

export const NUMERIQUE_GMAIL_SUBSCRIPTIONS_SHORTCUT =
  "https://mail.google.com/mail/u/0/#sub";

export const NUMERIQUE_SOURCES: NumeriqueSource[] = [
  {
    id: "gmail-subscriptions",
    name: "Google — Gérer vos abonnements dans Gmail",
    url: "https://support.google.com/mail/answer/15621070?hl=fr",
    label: { fr: "Gérer les abonnements", en: "Manage subscriptions" },
  },
  {
    id: "gmail-unsubscribe",
    name: "Google — Se désabonner d'un e-mail",
    url: "https://support.google.com/mail/answer/15433283?co=GENIE.Platform%3DDesktop&hl=fr",
    label: { fr: "Se désabonner d’un e-mail", en: "Unsubscribe from an email" },
  },
  {
    id: "gmail-cleanup",
    name: "Google — Supprimer des messages dans Gmail",
    url: "https://support.google.com/mail/answer/7401?co=GENIE.Platform%3DDesktop&hl=fr",
    label: { fr: "Supprimer les messages", en: "Delete messages" },
  },
  {
    id: "impact-spam",
    name: "Impact CO₂ — Spam (Base Empreinte ADEME)",
    url: "https://impactco2.fr/outils/usagenumerique/spam",
    label: { fr: "Impact d’un spam non lu", en: "Impact of unread spam" },
  },
  {
    id: "impact-cloud-storage",
    name: "Impact CO₂ — Stockage cloud (Base Empreinte ADEME)",
    url: "https://impactco2.fr/outils/usagenumerique/stockagedonnee",
    label: { fr: "Stockage cloud", en: "Cloud storage" },
  },
  {
    id: "impact-petrol-car",
    name: "Impact CO₂ — Voiture thermique moyenne essence",
    url: "https://impactco2.fr/outils/transport/voiture-compact-essence",
    label: { fr: "Voiture thermique moyenne", en: "Average petrol car" },
  },
];
export const NUMERIQUE_TUTORIAL: NumeriqueTutorialStep[] = [
  {
    id: "unsubscribe",
    title: { fr: "Stopper les newsletters", en: "Stop newsletters" },
    instruction: {
      fr: "Dans Gmail : Plus > Gérer les abonnements, puis désabonnez-vous des expéditeurs inutiles.",
      en: "In Gmail: More > Manage subscriptions, then unsubscribe from senders you no longer need.",
    },
    detail: {
      fr: "Le raccourci /#sub peut fonctionner, mais la fonction est encore déployée progressivement. S’il n’apparaît pas, ouvrez un mail puis cliquez sur « Se désabonner » (ou « Accéder au site Web » si Gmail le propose).",
      en: "The /#sub shortcut may work, but the feature is still rolling out. If it is not available, open an email and click “Unsubscribe” (or “Go to website” if Gmail offers it).",
    },
  },
  {
    id: "spam",
    title: { fr: "Vider le spam", en: "Empty Spam" },
    instruction: {
      fr: "Dans Gmail : Plus > Spam > Supprimer tous les messages de spam.",
      en: "In Gmail: More > Spam > Delete all spam messages.",
    },
    detail: {
      fr: "Vérifiez rapidement qu’aucun message légitime n’a été classé par erreur avant la suppression définitive.",
      en: "Quickly check that no legitimate message was misclassified before deleting everything permanently.",
    },
  },
  {
    id: "trash",
    title: { fr: "Vider définitivement la corbeille", en: "Empty the bin permanently" },
    instruction: {
      fr: "Dans Gmail : Plus > Corbeille > Supprimer définitivement, ou Vider la corbeille.",
      en: "In Gmail: More > Bin > Delete forever, or Empty bin.",
    },
    detail: {
      fr: "Cette étape est irréversible : ne la faites qu’après avoir vérifié les messages à conserver.",
      en: "This step is irreversible: do it only after checking which messages you need to keep.",
    },
  },
  {
    id: "large-messages",
    title: { fr: "Cibler les gros messages", en: "Target large messages" },
    instruction: {
      fr: "Ensuite, recherchez les mails avec pièces jointes ou les messages volumineux, puis supprimez seulement ce qui ne sert plus.",
      en: "Next, search for emails with attachments or large messages, then delete only what you no longer need.",
    },
    detail: {
      fr: "La recherche Gmail peut aider, par exemple avec has:attachment. Les pièces jointes et les anciens échanges sont à traiter après l’arrêt des futurs envois.",
      en: "Gmail search can help, for example with has:attachment. Handle attachments and old threads after stopping future mailings.",
    },
  },
];

export const NUMERIQUE_CONTENT = {
  summary: {
    fr: "Le levier prioritaire est d’éviter les futurs envois ; le nettoyage réduit ensuite le stockage qui reste nécessaire.",
    en: "The priority is to avoid future messages; cleanup then reduces the storage that remains necessary.",
  },
  facts: [
    {
      id: "cloud-resources",
      text: {
        fr: "Le stockage cloud mobilise des ressources, notamment pour construire et faire fonctionner les data-centers.",
        en: "Cloud storage uses resources, including to build and operate data centers.",
      },
    },
    {
      id: "past-transmission",
      text: {
        fr: "Un mail déjà reçu a déjà été transmis : le supprimer ensuite ne fait pas disparaître les émissions causées par cette transmission.",
        en: "An email that has already been received has already been transmitted: deleting it later does not erase the emissions caused by that transmission.",
      },
    },
  ] satisfies Array<{ id: string; text: ContentLocalizedText }>,
  recommendations: [
    {
      fr: "Commencer par se désabonner des envois que vous ne voulez plus recevoir.",
      en: "Start by unsubscribing from mailings you no longer want to receive.",
    },
    {
      fr: "Nettoyer ensuite Spam, la corbeille, puis les messages et pièces jointes volumineux.",
      en: "Then clean Spam, the bin, and finally large messages and attachments.",
    },
  ] satisfies NumeriqueLocalizedText[],
} as const;

export type NumeriqueCarbonEstimate = {
  co2eGrams: number;
  equivalentCarKm: number;
};

export function calculateAvoidedUnreadSpam(count: number): NumeriqueCarbonEstimate {
  const co2eGrams = count * NUMERIQUE_CO2_FACTORS.unreadSpamGramsPerEmail;
  return {
    co2eGrams,
    equivalentCarKm: co2eGrams / NUMERIQUE_CO2_FACTORS.averagePetrolCarGramsPerKm,
  };
}

export function calculateCloudStorageImpact(
  gigabytes: number,
  years = 1,
): NumeriqueCarbonEstimate {
  const co2eGrams =
    gigabytes * years * NUMERIQUE_CO2_FACTORS.cloudStorageGramsPerGbYear;
  return {
    co2eGrams,
    equivalentCarKm: co2eGrams / NUMERIQUE_CO2_FACTORS.averagePetrolCarGramsPerKm,
  };
}

export const NUMERIQUE_ORDER_OF_MAGNITUDE = {
  futureSpam: {
    count: 1_000,
    ...calculateAvoidedUnreadSpam(1_000),
  },
  cloudStorage: {
    gigabytes: 100,
    years: 1,
    ...calculateCloudStorageImpact(100),
  },
} as const;

const CONTENT_REVIEW_DATE = "2026-09-01";
const CONTENT_OWNER = "CleanMyMap — équipe éditoriale";
const CONTENT_REVIEWER = "CleanMyMap — revue éditoriale";

function claim(
  id: string,
  type: ContentClaim["type"],
  text: ContentLocalizedText,
  interpretationLimit: ContentLocalizedText,
): ContentClaim {
  return { id, type, text, interpretationLimit };
}

function createValidationRecord(params: {
  id: string;
  source: NumeriqueSource;
  facts?: ContentClaim[];
  estimates?: ContentClaim[];
  recommendations?: ContentClaim[];
}): ContentValidationRecord {
  return {
    id: params.id,
    kind: "environmental",
    status: "published",
    owner: CONTENT_OWNER,
    source: {
      name: params.source.name,
      url: params.source.url,
      date: CONTENT_REVIEW_DATE,
      datePrecision: "day",
      dateBasis: "document",
    },
    evidenceLevel: "strong",
    lastReviewedAt: CONTENT_REVIEW_DATE,
    reviewedBy: CONTENT_REVIEWER,
    claims: {
      fact: params.facts ?? [],
      estimate: params.estimates ?? [],
      recommendation: params.recommendations ?? [],
    },
  };
}

const sourceById = (id: string): NumeriqueSource => {
  const source = NUMERIQUE_SOURCES.find((candidate) => candidate.id === id);
  if (!source) {
    throw new Error(`Unknown numerique source: ${id}`);
  }
  return source;
};

export const NUMERIQUE_CONTENT_VALIDATION_RECORDS: ContentValidationRecord[] = [
  createValidationRecord({
    id: "learn.numerique.gmail-subscriptions",
    source: sourceById("gmail-subscriptions"),
    facts: [
      claim(
        "gmail-subscriptions-rollout",
        "fact",
        {
          fr: "Gmail indique que la gestion des abonnements est déployée progressivement et peut ne pas être disponible pour tout le monde.",
          en: "Gmail says that subscription management is rolling out gradually and may not be available to everyone.",
        },
        {
          fr: "La disponibilité dépend du déploiement de Gmail ; le tutoriel prévoit donc un fallback.",
          en: "Availability depends on Gmail's rollout; the tutorial therefore includes a fallback.",
        },
      ),
    ],
    recommendations: [
      claim(
        "unsubscribe-from-manage-subscriptions",
        "recommendation",
        {
          fr: "Privilégier le chemin Gmail Plus > Gérer les abonnements pour arrêter les newsletters inutiles.",
          en: "Prefer Gmail's More > Manage subscriptions path to stop unwanted newsletters.",
        },
        {
          fr: "Cette recommandation concerne les listes dont l’utilisateur ne souhaite plus recevoir les messages.",
          en: "This recommendation applies to mailing lists the user no longer wants to receive.",
        },
      ),
    ],
  }),
  createValidationRecord({
    id: "learn.numerique.gmail-unsubscribe",
    source: sourceById("gmail-unsubscribe"),
    facts: [
      claim(
        "gmail-email-fallback",
        "fact",
        {
          fr: "Gmail documente le fallback consistant à ouvrir un e-mail puis cliquer sur Se désabonner.",
          en: "Gmail documents the fallback of opening an email and clicking Unsubscribe.",
        },
        {
          fr: "Certains expéditeurs peuvent rediriger vers leur site au lieu de proposer un désabonnement direct.",
          en: "Some senders may redirect to their website instead of offering direct unsubscribe.",
        },
      ),
    ],
  }),
  createValidationRecord({
    id: "learn.numerique.gmail-cleanup",
    source: sourceById("gmail-cleanup"),
    facts: [
      claim(
        "gmail-spam-bin-cleanup",
        "fact",
        {
          fr: "Gmail documente la suppression de tous les messages de spam et la vidange définitive de la corbeille.",
          en: "Gmail documents deleting all spam messages and permanently emptying the bin.",
        },
        {
          fr: "La suppression définitive est irréversible pour les messages concernés.",
          en: "Permanent deletion is irreversible for the affected messages.",
        },
      ),
    ],
  }),
  createValidationRecord({
    id: "learn.numerique.impact-unread-spam",
    source: sourceById("impact-spam"),
    facts: [
      claim(
        "unread-spam-factor",
        "fact",
        {
          fr: "Impact CO₂ indique 3,74 gCO₂e par spam non lu, avec la Base Empreinte ADEME comme source.",
          en: "Impact CO₂ reports 3.74 gCO₂e per unread spam, with Base Empreinte ADEME as the source.",
        },
        {
          fr: "C’est un facteur pour un spam non lu, pas une mesure personnalisée de cette boîte mail.",
          en: "This is a factor for one unread spam, not a personalized measurement of this mailbox.",
        },
      ),
    ],
  }),
  createValidationRecord({
    id: "learn.numerique.impact-cloud-storage",
    source: sourceById("impact-cloud-storage"),
    facts: [
      claim(
        "cloud-storage-factor",
        "fact",
        {
          fr: "Impact CO₂ indique 0,24 gCO₂e pour 1 Go stocké dans le cloud pendant 1 an, avec la Base Empreinte ADEME comme source.",
          en: "Impact CO₂ reports 0.24 gCO₂e for 1 GB stored in the cloud for 1 year, with Base Empreinte ADEME as the source.",
        },
        {
          fr: "Il s’agit d’un ordre de grandeur annuel par Go, pas d’une mesure du stockage réel d’un compte Gmail.",
          en: "This is an annual order of magnitude per GB, not a measurement of a real Gmail account's storage.",
        },
      ),
    ],
  }),
  createValidationRecord({
    id: "learn.numerique.impact-petrol-car",
    source: sourceById("impact-petrol-car"),
    facts: [
      claim(
        "average-petrol-car-factor",
        "fact",
        {
          fr: "Impact CO₂ indique 170 gCO₂e par kilomètre pour une voiture thermique moyenne essence.",
          en: "Impact CO₂ reports 170 gCO₂e per kilometer for an average petrol thermal car.",
        },
        {
          fr: "Cette voiture est une équivalence de lecture, pas un déplacement évité réellement.",
          en: "This car is a reading equivalence, not an actual avoided trip.",
        },
      ),
    ],
  }),
  createValidationRecord({
    id: "learn.numerique.derived-future-spam-equivalence",
    source: sourceById("impact-spam"),
    estimates: [
      claim(
        "future-spam-car-equivalence",
        "estimate",
        {
          fr: "En appliquant les facteurs centralisés, 1 000 futurs spams évités représentent environ 3 740 gCO₂e, soit environ 22 km en voiture thermique moyenne essence.",
          en: "Applying the centralized factors, 1,000 future spam messages avoided represent about 3,740 gCO₂e, or about 22 km in an average petrol car.",
        },
        {
          fr: "Équivalence dérivée des facteurs spam et voiture ; elle ne décrit pas une économie mesurée et ne s’applique pas à 1 000 spams déjà reçus.",
          en: "Equivalence derived from the spam and car factors; it is not a measured saving and does not apply to 1,000 messages already received.",
        },
      ),
    ],
  }),
  createValidationRecord({
    id: "learn.numerique.derived-cloud-storage-equivalence",
    source: sourceById("impact-cloud-storage"),
    estimates: [
      claim(
        "cloud-storage-car-equivalence",
        "estimate",
        {
          fr: "En appliquant les facteurs centralisés, 100 Go stockés pendant un an représentent environ 24 gCO₂e, soit environ 0,14 km en voiture thermique moyenne essence.",
          en: "Applying the centralized factors, 100 GB stored for one year represent about 24 gCO₂e, or about 0.14 km in an average petrol car.",
        },
        {
          fr: "Équivalence dérivée des facteurs stockage et voiture ; elle ne mesure pas le stockage réel d’un compte Gmail.",
          en: "Equivalence derived from the storage and car factors; it does not measure the real storage of a Gmail account.",
        },
      ),
    ],
  }),
];
