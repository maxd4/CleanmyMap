export type QuizQuestionFormatId =
  | "vrai-faux-piegeux"
  | "situations-terrain"
  | "comparaisons"
  | "cases-a-cocher"
  | "estimations"
  | "consequences-indirectes"
  | "questions-contre-intuitives"
  | "mini-enquetes"
  | "cas-limites"
  | "mythes-et-realites";

export type QuizQuestionFormatDefinition = {
  id: QuizQuestionFormatId;
  label: string;
  objective: string;
  benefits: string[];
  avoid: string[];
};

export const QUIZ_QUESTION_FORMATS: readonly QuizQuestionFormatDefinition[] = [
  {
    id: "vrai-faux-piegeux",
    label: "Vrai / Faux piégeux",
    objective:
      "Combattre les idées reçues, exploiter les intuitions erronées et obliger le joueur à réfléchir avant de répondre.",
    benefits: [
      "Corrige les croyances courantes",
      "Fait hésiter avant la réponse",
      "Révèle les écarts entre intuition et réalité",
    ],
    avoid: [
      "Les affirmations trop caricaturales",
      "Les réponses évidentes après une première lecture",
      "Les formulations qui donnent la réponse dans le texte",
    ],
  },
  {
    id: "situations-terrain",
    label: "Situations terrain",
    objective:
      "Reproduire des cas réalistes rencontrés lors d'une cleanwalk, faire prendre une décision concrète et renforcer les bonnes pratiques et la sécurité.",
    benefits: [
      "Ancre la pédagogie dans le réel",
      "Teste le bon geste en contexte",
      "Rend les consignes opérationnelles",
    ],
    avoid: [
      "Les cas trop théoriques",
      "Les questions qui ne demandent aucune décision",
      "Les situations irréalistes ou trop faciles à deviner",
    ],
  },
  {
    id: "comparaisons",
    label: "Comparaisons",
    objective:
      "Comparer plusieurs déchets, matériaux, comportements ou impacts pour identifier les différences importantes et éviter les réponses évidentes.",
    benefits: [
      "Fait ressortir les écarts utiles",
      "Aide à classer et hiérarchiser",
      "Réduit les réponses automatiques",
    ],
    avoid: [
      "Les comparaisons trop simples ou trop scolaires",
      "Les écarts triviaux",
      "Les options caricaturales qui éliminent trop vite l'hésitation",
    ],
  },
  {
    id: "cases-a-cocher",
    label: "Cases à cocher",
    objective:
      "Sélectionner plusieurs réponses lorsqu'il faut exclure des objets, des gestes ou des situations à risque plutôt que choisir une seule bonne option.",
    benefits: [
      "Teste la capacité à reconnaître plusieurs éléments à éviter",
      "Apprend à identifier les cas dangereux sans réponse unique",
      "Colle mieux à certains gestes de terrain",
    ],
    avoid: [
      "Les questions où une seule réponse est réellement attendue",
      "Les listes trop courtes ou trop évidentes",
      "Les distracteurs absurdes qui ne demandent aucun tri mental",
    ],
  },
  {
    id: "estimations",
    label: "Estimations",
    objective:
      "Travailler les ordres de grandeur, éviter la mémorisation brute et favoriser le raisonnement approximatif.",
    benefits: [
      "Ancre les quantités dans une échelle réaliste",
      "Réduit l'effet de récitation",
      "Aide à lire les impacts sans précision trompeuse",
    ],
    avoid: [
      "Les chiffres décoratifs sans usage pédagogique",
      "Les équivalences trop exactes ou trop scolaires",
      "Les questions qui ne demandent qu'un rappel brut",
    ],
  },
  {
    id: "consequences-indirectes",
    label: "Conséquences indirectes",
    objective:
      "Comprendre les effets cachés d'un comportement ; relier une action locale à ses impacts réels ; développer une vision systémique.",
    benefits: [
      "Révèle l'impact caché d'un geste",
      "Connecte le terrain à un enjeu global",
      "Développe la pensée systémique",
    ],
    avoid: [
      "Les enchaînements trop complexes",
      "Les liens de causalité non prouvés",
      "Les conséquences trop évidentes",
    ],
  },
  {
    id: "questions-contre-intuitives",
    label: "Questions contre-intuitives",
    objective:
      "Surprendre le joueur ; remettre en question une intuition ; créer un effet 'je ne savais pas'.",
    benefits: [
      "Casse les certitudes trompeuses",
      "Génère un fort effet de surprise",
      "Attise la curiosité",
    ],
    avoid: [
      "Les pièges sémantiques ou jeux de mots",
      "Les statistiques obscures impossibles à deviner",
      "Les faits anecdotiques",
    ],
  },
  {
    id: "mini-enquetes",
    label: "Mini enquêtes",
    objective:
      "Présenter plusieurs indices ; demander au joueur d'identifier la cause la plus probable ou la meilleure explication ; développer l'esprit critique.",
    benefits: [
      "Simule une démarche d'investigation",
      "Développe l'esprit critique et l'analyse",
      "Implique davantage le joueur",
    ],
    avoid: [
      "Les indices contradictoires sans solution claire",
      "Les enquêtes trop longues",
      "Les conclusions sans base logique",
    ],
  },
  {
    id: "cas-limites",
    label: "Cas limites",
    objective:
      "Situations ambiguës ; déchets difficiles à identifier ; arbitrages entre plusieurs solutions imparfaites ; éviter les réponses binaires trop simples.",
    benefits: [
      "Prépare à la réalité complexe du terrain",
      "Apprend à prioriser et faire des arbitrages",
      "Sort de la logique binaire vrai/faux",
    ],
    avoid: [
      "Les situations impossibles à résoudre",
      "L'ambiguïté pour l'ambiguïté sans valeur pédagogique",
      "Les choix sans consigne claire à retenir",
    ],
  },
  {
    id: "mythes-et-realites",
    label: "Mythes et réalités",
    objective:
      "Partir d'une affirmation populaire ; demander si elle est correcte, partiellement correcte ou fausse ; corriger les croyances fréquentes.",
    benefits: [
      "Nuance la réflexion (partiellement vrai/faux)",
      "Déconstruit efficacement les légendes urbaines",
      "Apporte une réponse claire et mémorable",
    ],
    avoid: [
      "Les mythes que personne ne croit vraiment",
      "Les explications trop jargonneuses",
      "Se limiter à un vrai/faux basique sans nuance",
    ],
  },
] as const;

const QUIZ_QUESTION_FORMAT_BY_ID: Record<QuizQuestionFormatId, QuizQuestionFormatDefinition> =
  Object.fromEntries(QUIZ_QUESTION_FORMATS.map((format) => [format.id, format])) as Record<
    QuizQuestionFormatId,
    QuizQuestionFormatDefinition
  >;

export function getQuizQuestionFormat(formatId: QuizQuestionFormatId): QuizQuestionFormatDefinition {
  return QUIZ_QUESTION_FORMAT_BY_ID[formatId];
}

export function listQuizQuestionFormatIds(): QuizQuestionFormatId[] {
  return QUIZ_QUESTION_FORMATS.map((format) => format.id);
}
