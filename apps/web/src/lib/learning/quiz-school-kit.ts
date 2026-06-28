import type { QuizSchoolTrackId } from "@/components/learn/quiz-school-modes";

export type QuizSchoolKitStatus =
  | {
      kind: "source";
      label: string;
      href: string;
    }
  | {
      kind: "needsReview";
      note: string;
    };

export type QuizSchoolKitQuestion = {
  id: string;
  trackId: QuizSchoolTrackId;
  typeLabel: "Vrai / Faux" | "QCM" | "Réponse courte";
  question: string;
  answer: string;
  explanation: string;
  takeaway: string;
  status?: QuizSchoolKitStatus;
};

export type QuizSchoolKitStep = {
  title: string;
  lead: string;
  detail: string;
};

export const QUIZ_SCHOOL_KIT_STEPS: QuizSchoolKitStep[] = [
  {
    title: "Introduction",
    lead: "Pourquoi parler des déchets et du développement durable ?",
    detail:
      "On part d'exemples concrets pour relier les gestes du quotidien à la qualité de l'environnement, au tri et aux habitudes collectives.",
  },
  {
    title: "Quiz collectif",
    lead: "Vote, débat, révélation de la réponse",
    detail:
      "Chaque élève se positionne, la classe justifie ses choix puis l'enseignant révèle le corrigé pour faire ressortir le raisonnement.",
  },
  {
    title: "Discussion",
    lead: "Pourquoi certaines réponses sont piégeuses ?",
    detail:
      "On prend un temps pour démêler les mots qui trompent, les idées reçues et les réflexes trop rapides.",
  },
  {
    title: "Conclusion",
    lead: "Trois réflexes concrets à retenir",
    detail:
      "On termine avec trois gestes simples, une règle de sécurité et une idée reçue corrigée pour repartir avec l'essentiel.",
  },
];

export const QUIZ_SCHOOL_TEACHER_GUIDE = [
  "Objectif: faire raisonner, argumenter et distinguer une intuition d'une règle fiable.",
  "Durée conseillée: 30 à 45 minutes, avec une part importante de discussion.",
  "Matériel: vidéoprojecteur, tableau, quelques feuilles de vote ou doigts levés, et si besoin un minuteur.",
  "Animation: afficher une question, faire voter, demander une justification courte, puis révéler la réponse.",
  "Débat: faire reformuler l'idée d'un camarade avant de donner son avis aide à faire émerger les nuances.",
  "RGPD: pas de compte élève, pas de nom, pas de collecte de données personnelles inutiles.",
];

export const QUIZ_SCHOOL_STUDENT_SHEET = [
  "Ce que j'ai appris aujourd'hui.",
  "Une idée reçue corrigée.",
  "Un geste que je peux changer.",
  "Une question que je me pose encore.",
];

export const QUIZ_SCHOOL_KIT_BANK: QuizSchoolKitQuestion[] = [
  {
    id: "deb-1",
    trackId: "debat-classe",
    typeLabel: "Vrai / Faux",
    question: "Le recyclage suffit à lui seul pour résoudre le problème des déchets.",
    answer: "Faux",
    explanation:
      "Le recyclage aide, mais il ne remplace ni la réduction à la source ni la réutilisation. Si on ne change rien en amont, on déplace seulement une partie du problème.",
    takeaway: "Réduire avant de recycler reste le réflexe le plus efficace.",
  },
  {
    id: "deb-2",
    trackId: "debat-classe",
    typeLabel: "Vrai / Faux",
    question: "Une consigne locale peut être plus importante qu'un conseil général trouvé ailleurs.",
    answer: "Vrai",
    explanation:
      "Le tri dépend des filières disponibles sur le territoire. Une règle générale peut aider à comprendre, mais la consigne locale décide toujours en dernier.",
    takeaway: "La règle locale prime sur l'habitude ou sur un conseil entendu ailleurs.",
  },
  {
    id: "deb-3",
    trackId: "debat-classe",
    typeLabel: "QCM",
    question: "Pourquoi une réponse piégeuse peut-elle être utile en classe ?",
    answer: "Parce qu'elle oblige à justifier son raisonnement avant de conclure.",
    explanation:
      "Une bonne question ne cherche pas seulement la bonne case: elle fait apparaître les raccourcis de pensée, les nuances et les limites d'une intuition trop rapide.",
    takeaway: "La discussion compte autant que la réponse finale.",
  },
  {
    id: "deb-4",
    trackId: "debat-classe",
    typeLabel: "Vrai / Faux",
    question: "On peut parler de gestes individuels sans jamais parler du système qui les rend nécessaires.",
    answer: "Faux",
    explanation:
      "Les gestes personnels sont utiles, mais ils prennent tout leur sens quand on relie aussi l'organisation, les choix de production et les règles locales.",
    takeaway: "Le geste compte, mais le cadre compte aussi.",
  },
  {
    id: "deb-5",
    trackId: "debat-classe",
    typeLabel: "Réponse courte",
    question: "Quel est le bon objectif d'un atelier de débat sur les déchets ?",
    answer: "Faire réfléchir avant de trancher, puis retenir une règle utile.",
    explanation:
      "Le but n'est pas d'aller vite vers une seule bonne réponse, mais d'apprendre à comparer des options, à écouter les objections et à dégager un réflexe fiable.",
    takeaway: "Débattre sert à mieux décider, pas à gagner.",
  },
  {
    id: "ter-1",
    trackId: "mission-terrain",
    typeLabel: "Vrai / Faux",
    question: "Une seringue usagée se ramasse comme un déchet banal si elle est au sol.",
    answer: "Faux",
    explanation:
      "Un objet piquant ou potentiellement souillé peut exposer à un risque sanitaire. Dans ce cas, on ne ramasse pas à main nue et on applique la consigne de sécurité.",
    takeaway: "La sécurité passe avant le réflexe de ramassage.",
  },
  {
    id: "ter-2",
    trackId: "mission-terrain",
    typeLabel: "Vrai / Faux",
    question: "Un bidon fermé contenant un liquide inconnu doit être ouvert pour vérifier ce qu'il y a dedans.",
    answer: "Faux",
    explanation:
      "On ne manipule pas un contenu inconnu sans consigne claire. Le bon geste est d'isoler, de signaler et de laisser décider la personne référente.",
    takeaway: "Quand on ne sait pas, on n'ouvre pas.",
  },
  {
    id: "ter-3",
    trackId: "mission-terrain",
    typeLabel: "QCM",
    question: "Que faire si la consigne locale manque au moment de trier un déchet trouvé sur le terrain ?",
    answer: "Isoler le déchet, signaler le cas et demander la règle adaptée.",
    explanation:
      "Deviner est souvent le plus mauvais réflexe. En terrain réel, mieux vaut suspendre le geste, protéger le groupe et demander une décision claire.",
    takeaway: "Isoler et signaler vaut mieux que deviner.",
  },
  {
    id: "ter-4",
    trackId: "mission-terrain",
    typeLabel: "Vrai / Faux",
    question: "Sur une cleanwalk, aller vite est plus important que respecter la sécurité du groupe.",
    answer: "Faux",
    explanation:
      "Une action efficace reste une action sûre. Le tri, le port de gants si besoin, l'attention aux objets coupants et l'organisation collective priment sur la vitesse.",
    takeaway: "Mieux vaut une cleanwalk sûre qu'une cleanwalk rapide.",
  },
  {
    id: "ter-5",
    trackId: "mission-terrain",
    typeLabel: "Réponse courte",
    question: "Quel réflexe doit rester commun à toute l'équipe quand un déchet semble dangereux ?",
    answer: "On stoppe la manipulation et on demande la consigne.",
    explanation:
      "Cette règle simple évite les décisions improvisées. Elle protège le groupe, limite les erreurs et rappelle que la mission terrain reste encadrée.",
    takeaway: "Stopper, protéger, demander.",
  },
  {
    id: "ord-1",
    trackId: "ordres-de-grandeur",
    typeLabel: "QCM",
    question: "Si 10 000 personnes laissent chacune 100 g de déchets, on atteint environ :",
    answer: "1 tonne",
    explanation:
      "100 g multipliés par 10 000 donnent 1 000 000 g, soit 1 000 kg. Le calcul sert surtout à montrer qu'une petite quantité peut devenir très grande à l'échelle d'un groupe.",
    takeaway: "Une petite quantité répétée à grande échelle devient un vrai volume.",
  },
  {
    id: "ord-2",
    trackId: "ordres-de-grandeur",
    typeLabel: "Vrai / Faux",
    question: "Une bouteille plastique disparaît complètement en quelques mois dans la nature.",
    answer: "Faux",
    explanation:
      "La durée de dégradation dépend du milieu et il n'existe pas une seule valeur magique à retenir. La bonne attitude est de se méfier des chiffres trop précis sans source.",
    takeaway: "Un chiffre isolé mérite toujours d'être vérifié.",
    status: {
      kind: "needsReview",
      note: "Durée très variable selon le milieu: à vérifier avant citation publique.",
    },
  },
  {
    id: "ord-3",
    trackId: "ordres-de-grandeur",
    typeLabel: "Vrai / Faux",
    question: "Recycler un objet supprime automatiquement toute dépense d'énergie.",
    answer: "Faux",
    explanation:
      "Le recyclage évite souvent une partie des impacts, mais il demande encore du transport, du tri et du traitement. La question utile est donc toujours celle du bilan global.",
    takeaway: "Recycler aide, mais ne rend jamais l'impact nul.",
    status: {
      kind: "needsReview",
      note: "Bilan énergétique à citer avec prudence et source si utilisé en cours.",
    },
  },
  {
    id: "ord-4",
    trackId: "ordres-de-grandeur",
    typeLabel: "QCM",
    question: "Quand une petite quantité est multipliée par 100, que faut-il surtout faire ?",
    answer: "Changer d'échelle de lecture avant de conclure.",
    explanation:
      "Le bon raisonnement ne consiste pas seulement à compter. Il faut se demander si l'on parle d'un geste isolé, d'une classe entière, d'un collège ou d'une ville.",
    takeaway: "Changer d'échelle change souvent la réponse.",
  },
  {
    id: "ord-5",
    trackId: "ordres-de-grandeur",
    typeLabel: "Réponse courte",
    question: "Pourquoi un chiffre sans contexte peut-il tromper ?",
    answer: "Parce qu'on ne sait pas à quelle échelle il s'applique.",
    explanation:
      "Un chiffre brut peut paraître énorme ou minuscule selon ce avec quoi on le compare. Le contexte aide à décider si l'information est vraiment utile.",
    takeaway: "Le contexte donne du sens au chiffre.",
  },
  {
    id: "qdd-1",
    trackId: "gestes-du-quotidien",
    typeLabel: "Vrai / Faux",
    question: "Prendre une gourde réutilisable peut réduire une partie des déchets du quotidien.",
    answer: "Vrai",
    explanation:
      "Une gourde ne règle pas tout, mais elle remplace des contenants à usage unique et aide à faire baisser le volume de déchets produits.",
    takeaway: "Remplacer un jetable par un réutilisable agit sur la durée.",
  },
  {
    id: "qdd-2",
    trackId: "gestes-du-quotidien",
    typeLabel: "Vrai / Faux",
    question: "Rincer à grande eau tous les emballages avant le tri est toujours la meilleure solution.",
    answer: "Faux",
    explanation:
      "Le bon geste dépend des consignes locales et du type d'emballage. Inutile de gaspiller de l'eau si une simple vidange suffit.",
    takeaway: "On suit la consigne locale, pas une habitude automatique.",
  },
  {
    id: "qdd-3",
    trackId: "gestes-du-quotidien",
    typeLabel: "QCM",
    question: "Quel geste a souvent l'effet le plus durable sur les déchets du quotidien ?",
    answer: "Éviter le déchet avant de devoir le trier.",
    explanation:
      "Trier reste utile, mais réduire les objets jetables, acheter juste ce qu'il faut et réutiliser quand c'est possible agit plus tôt dans la chaîne.",
    takeaway: "Le meilleur déchet est celui qu'on n'a pas produit.",
  },
  {
    id: "qdd-4",
    trackId: "gestes-du-quotidien",
    typeLabel: "Vrai / Faux",
    question: "Un objet réutilisable n'a plus aucun impact parce qu'on le garde longtemps.",
    answer: "Faux",
    explanation:
      "Fabriquer et transporter un objet réutilisable a aussi un coût. Il devient intéressant quand il remplace assez souvent des objets jetables.",
    takeaway: "Réutiliser aide si l'objet sert vraiment longtemps.",
    status: {
      kind: "needsReview",
      note: "Impact de fabrication à contextualiser avant usage chiffré.",
    },
  },
  {
    id: "qdd-5",
    trackId: "gestes-du-quotidien",
    typeLabel: "Réponse courte",
    question: "Quel geste de classe peut faire baisser les déchets sans effort spectaculaire ?",
    answer: "Réduire les achats jetables répétés et partager les bons réflexes.",
    explanation:
      "Un geste répété par toute une classe, comme éviter les bouteilles jetables ou mieux préparer les sorties, finit par produire un effet visible.",
    takeaway: "Un petit geste partagé devient un geste collectif.",
  },
];

export function groupQuizSchoolKitQuestionsByTrack(
  questions: readonly QuizSchoolKitQuestion[],
): Record<QuizSchoolTrackId, QuizSchoolKitQuestion[]> {
  const grouped: Record<QuizSchoolTrackId, QuizSchoolKitQuestion[]> = {
    "debat-classe": [],
    "mission-terrain": [],
    "ordres-de-grandeur": [],
    "gestes-du-quotidien": [],
  };

  for (const question of questions) {
    grouped[question.trackId].push(question);
  }

  return grouped;
}
