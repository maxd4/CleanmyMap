import type { QuizDifficultyId, QuizSkillId } from "../quiz-taxonomy";
import type { QuizSchoolLevel } from "./quiz-school-types";

export type QuizSchoolWorkshopAssessmentPhase = "pre-quiz" | "post-quiz";

export type QuizSchoolWorkshopAssessmentType = "qcm-raisonne" | "estimation" | "situation-probleme";

export type QuizSchoolAssessmentLocalizedText = { fr: string; en: string };

export type QuizSchoolWorkshopAssessmentSource = {
  label: QuizSchoolAssessmentLocalizedText;
  href: string;
  kind: "interne";
};

export type QuizSchoolWorkshopAssessmentLevelProfile = {
  difficulty: QuizDifficultyId;
  skills: readonly QuizSkillId[];
};

export type QuizSchoolWorkshopAssessmentItem = {
  id: string;
  pairId: string;
  conceptId: string;
  notion: QuizSchoolAssessmentLocalizedText;
  phase: QuizSchoolWorkshopAssessmentPhase;
  theme: "ecocitoyennete" | "habitudes-utiles" | "science-et-calcul" | "echelles-collectives";
  type: QuizSchoolWorkshopAssessmentType;
  prompt: QuizSchoolAssessmentLocalizedText;
  options: Readonly<Record<string, QuizSchoolAssessmentLocalizedText>>;
  correctOptionId: string;
  explanation: QuizSchoolAssessmentLocalizedText;
  allowedLevels: readonly QuizSchoolLevel[];
  levelProfiles: Readonly<Record<QuizSchoolLevel, QuizSchoolWorkshopAssessmentLevelProfile>>;
  source: QuizSchoolWorkshopAssessmentSource;
  validationStatus: "validated" | "needsReview";
  needsReview?: boolean;
  isTransfer?: boolean;
};

export type ResolvedQuizSchoolWorkshopAssessmentItem = QuizSchoolWorkshopAssessmentItem & {
  difficulty: QuizDifficultyId;
  skills: readonly QuizSkillId[];
};

export const QUIZ_SCHOOL_WORKSHOP_ASSESSMENT_CONCEPT_COUNT = 8;
export const QUIZ_SCHOOL_WORKSHOP_PRE_ASSESSMENT_SIZE = 8;
export const QUIZ_SCHOOL_WORKSHOP_POST_ASSESSMENT_SIZE = 10;

const ALL_LEVELS: readonly QuizSchoolLevel[] = ["6e", "5e", "4e", "3e"];
const SOURCE: QuizSchoolWorkshopAssessmentSource = {
  label: { fr: "CleanMyMap — guide d’écriture pédagogique du Quiz", en: "CleanMyMap — Quiz authoring guide" },
  href: "/documentation/features/quiz-authoring-guide.md",
  kind: "interne",
};

const LEVEL_DIFFICULTY: Readonly<Record<QuizSchoolLevel, QuizDifficultyId>> = {
  "6e": "low",
  "5e": "low",
  "4e": "medium",
  "3e": "high",
};

function profiles(skills: readonly QuizSkillId[]): Readonly<Record<QuizSchoolLevel, QuizSchoolWorkshopAssessmentLevelProfile>> {
  return Object.fromEntries(
    ALL_LEVELS.map((level) => [level, { difficulty: LEVEL_DIFFICULTY[level], skills }]),
  ) as Record<QuizSchoolLevel, QuizSchoolWorkshopAssessmentLevelProfile>;
}

function option(fr: string, en: string): QuizSchoolAssessmentLocalizedText {
  return { fr, en };
}

function item(
  definition: Omit<QuizSchoolWorkshopAssessmentItem, "allowedLevels" | "levelProfiles" | "source" | "validationStatus">,
): QuizSchoolWorkshopAssessmentItem {
  return {
    ...definition,
    allowedLevels: ALL_LEVELS,
    levelProfiles: profiles(definition.type === "estimation" ? ["estimation", "comparaison"] : ["idée reçue", "conséquences indirectes"]),
    source: SOURCE,
    validationStatus: "validated",
  };
}

const PRE_ITEMS: readonly QuizSchoolWorkshopAssessmentItem[] = [
  item({
    id: "atelier-pre-eco-citoyen",
    pairId: "eco-citoyen",
    conceptId: "eco-citoyen",
    notion: option("Agir en éco-citoyen", "Acting as an eco-citizen"),
    phase: "pre-quiz",
    theme: "ecocitoyennete",
    type: "qcm-raisonne",
    prompt: option("Quel choix ressemble le plus à une démarche éco-citoyenne ?", "Which choice best reflects eco-citizenship?"),
    options: {
      a: option("Ne jamais faire d’erreur", "Never make a mistake"),
      b: option("Comprendre les effets d’un choix et agir avec les autres", "Understand a choice's effects and act with others"),
      c: option("Laisser les autres décider", "Let others decide"),
    },
    correctOptionId: "b",
    explanation: option("L’éco-citoyenneté consiste à comprendre, décider et agir à son échelle avec les autres, pas à être parfait.", "Eco-citizenship means understanding, deciding and acting at one's scale with others, not being perfect."),
  }),
  item({
    id: "atelier-pre-eviter-envoi",
    pairId: "eviter-envoi",
    conceptId: "eviter-envoi",
    notion: option("Éviter un futur envoi", "Avoiding a future send"),
    phase: "pre-quiz",
    theme: "habitudes-utiles",
    type: "qcm-raisonne",
    prompt: option("Pour réduire un impact lié aux newsletters, quel levier vient en premier ?", "To reduce an impact linked to newsletters, which lever comes first?"),
    options: {
      a: option("Éviter les prochains envois inutiles", "Avoid future unnecessary sends"),
      b: option("Supprimer seulement un message déjà reçu", "Only delete a message already received"),
      c: option("Changer la couleur de sa boîte mail", "Change the inbox colour"),
    },
    correctOptionId: "a",
    explanation: option("Supprimer un message déjà reçu ne revient pas sur sa transmission ; se désabonner peut éviter de futurs envois.", "Deleting a message already received does not undo its transmission; unsubscribing can avoid future sends."),
  }),
  item({
    id: "atelier-pre-reduire-reutiliser",
    pairId: "reduire-reutiliser",
    conceptId: "reduire-reutiliser",
    notion: option("Réduire avant de trier", "Reduce before sorting"),
    phase: "pre-quiz",
    theme: "habitudes-utiles",
    type: "qcm-raisonne",
    prompt: option("Quelle suite commence généralement par le levier le plus en amont ?", "Which sequence generally starts with the most upstream lever?"),
    options: {
      a: option("Acheter davantage puis trier", "Buy more then sort"),
      b: option("Réduire le besoin, réutiliser, puis trier ce qui reste", "Reduce the need, reuse, then sort what remains"),
      c: option("Jeter directement", "Throw away directly"),
    },
    correctOptionId: "b",
    explanation: option("Réduire et réutiliser évitent d’abord de produire ou de jeter ; le tri reste utile pour ce qui reste.", "Reducing and reusing first avoid producing or throwing away; sorting remains useful for what is left."),
  }),
  item({
    id: "atelier-pre-decision-quotidien",
    pairId: "decision-quotidien",
    conceptId: "decision-quotidien",
    notion: option("Comparer les effets et les contraintes", "Compare effects and constraints"),
    phase: "pre-quiz",
    theme: "habitudes-utiles",
    type: "qcm-raisonne",
    prompt: option("Avant de choisir une habitude de mobilité ou d’alimentation, que faut-il surtout faire ?", "Before choosing a food or mobility habit, what should you mainly do?"),
    options: {
      a: option("Comparer les effets, les contraintes et le contexte", "Compare effects, constraints and context"),
      b: option("Choisir le slogan le plus court", "Choose the shortest slogan"),
      c: option("Supposer qu’une solution vaut partout", "Assume one solution works everywhere"),
    },
    correctOptionId: "a",
    explanation: option("Une décision utile dépend du contexte : on compare ce qu’elle change, ses contraintes et ses effets indirects.", "A useful decision depends on context: compare what it changes, its constraints and indirect effects."),
  }),
  item({
    id: "atelier-pre-causalite",
    pairId: "causalite",
    conceptId: "causalite",
    notion: option("Relier cause et conséquence", "Connect cause and consequence"),
    phase: "pre-quiz",
    theme: "science-et-calcul",
    type: "qcm-raisonne",
    prompt: option("Si une classe éteint les lumières inutiles, quelle affirmation est la plus prudente ?", "If a class switches off unnecessary lights, which statement is most careful?"),
    options: {
      a: option("Cela peut réduire une consommation, selon le matériel et la durée", "It can reduce consumption, depending on equipment and duration"),
      b: option("Cela règle tous les problèmes climatiques", "It solves every climate problem"),
      c: option("Cela ne change jamais rien", "It never changes anything"),
    },
    correctOptionId: "a",
    explanation: option("Le geste a un effet possible mais limité et dépend des conditions. Une cause n’explique pas tout le système.", "The action can have a limited effect that depends on conditions. One cause does not explain the whole system."),
  }),
  item({
    id: "atelier-pre-ordre-grandeur",
    pairId: "ordre-grandeur",
    conceptId: "ordre-grandeur",
    notion: option("Estimer avec une unité", "Estimate with a unit"),
    phase: "pre-quiz",
    theme: "science-et-calcul",
    type: "estimation",
    prompt: option("Une classe évite 3 gobelets par jour pendant 5 jours. Quel ordre de grandeur obtient-on ?", "A class avoids 3 cups per day for 5 days. What order of magnitude do we get?"),
    options: {
      a: option("Environ 15 gobelets", "About 15 cups"),
      b: option("Environ 1500 gobelets", "About 1,500 cups"),
      c: option("Impossible à estimer", "Impossible to estimate"),
    },
    correctOptionId: "a",
    explanation: option("3 × 5 = 15. L’unité et l’hypothèse — une classe, cinq jours — doivent rester visibles.", "3 × 5 = 15. The unit and assumption — one class, five days — must remain visible."),
  }),
  item({
    id: "atelier-pre-echelles",
    pairId: "echelles-collectives",
    conceptId: "echelles-collectives",
    notion: option("Changer d’échelle", "Change scale"),
    phase: "pre-quiz",
    theme: "echelles-collectives",
    type: "qcm-raisonne",
    prompt: option("Quelle proposition passe du geste individuel à une action de collège ?", "Which proposal moves from an individual gesture to a school action?"),
    options: {
      a: option("Chacun agit sans en parler", "Everyone acts without discussing it"),
      b: option("La classe mesure un besoin puis propose une règle au collège", "The class measures a need then proposes a school rule"),
      c: option("Attendre une solution nationale pour commencer", "Wait for a national solution before starting"),
    },
    correctOptionId: "b",
    explanation: option("Une action collective rend visibles un besoin, une décision et une organisation à l’échelle adaptée.", "Collective action makes a need, a decision and an organisation visible at the right scale."),
  }),
  item({
    id: "atelier-pre-source-indicateur",
    pairId: "source-indicateur",
    conceptId: "source-indicateur",
    notion: option("Questionner une affirmation", "Question a claim"),
    phase: "pre-quiz",
    theme: "ecocitoyennete",
    type: "qcm-raisonne",
    prompt: option("Une affiche dit : « Cette solution est toujours la meilleure ». Quelle question poser ?", "A poster says: “This solution is always the best.” What should you ask?"),
    options: {
      a: option("Quelle est la source, la mesure et la limite de l’affirmation ?", "What are the source, measure and limit of the claim?"),
      b: option("Est-ce écrit en gros ?", "Is it written in large letters?"),
      c: option("Puis-je la partager sans vérifier ?", "Can I share it without checking?"),
    },
    correctOptionId: "a",
    explanation: option("Une source, un indicateur et un périmètre aident à savoir ce que l’affirmation montre — et ce qu’elle ne montre pas.", "A source, an indicator and a scope help identify what a claim shows — and what it does not."),
  }),
];

const POST_ITEMS: readonly QuizSchoolWorkshopAssessmentItem[] = [
  ...PRE_ITEMS.map((pre) => ({
    ...pre,
    id: pre.id.replace("pre", "post"),
    phase: "post-quiz" as const,
    prompt: option(
      {
        "eco-citoyen": "Après l’atelier, comment reconnaître une démarche éco-citoyenne ?",
        "eviter-envoi": "Pour une newsletter reçue, quelle action agit sur les prochains messages ?",
        "reduire-reutiliser": "Quel choix évite le plus en amont un déchet inutile ?",
        "decision-quotidien": "Une solution de mobilité peut-elle être la meilleure dans tous les contextes ?",
        causalite: "Que peut-on conclure prudemment après avoir éteint une lumière inutile ?",
        "ordre-grandeur": "Avec 3 gobelets évités chaque jour pendant 5 jours, quel calcul est correct ?",
        "echelles-collectives": "Comment une classe peut-elle faire passer une idée à l’échelle du collège ?",
        "source-indicateur": "Avant de reprendre une promesse écologique, quel contrôle est utile ?",
      }[pre.conceptId] ?? pre.prompt.fr,
      {
        "eco-citoyen": "After the activity, how can you recognise eco-citizenship?",
        "eviter-envoi": "For a received newsletter, which action affects future messages?",
        "reduire-reutiliser": "Which choice avoids unnecessary waste furthest upstream?",
        "decision-quotidien": "Can one mobility solution be best in every context?",
        causalite: "What can we carefully conclude after switching off an unnecessary light?",
        "ordre-grandeur": "With 3 cups avoided each day for 5 days, which calculation is correct?",
        "echelles-collectives": "How can a class move an idea to the school level?",
        "source-indicateur": "Before repeating an environmental promise, which check is useful?",
      }[pre.conceptId] ?? pre.prompt.en,
    ),
    explanation: pre.explanation,
  })),
  item({
    id: "atelier-post-transfert-college",
    pairId: "transfert-college",
    conceptId: "transfert-college",
    notion: option("Choisir une action faisable et mesurable", "Choose a feasible, measurable action"),
    phase: "post-quiz",
    theme: "echelles-collectives",
    type: "situation-probleme",
    prompt: option("Le collège veut réduire les déchets du déjeuner. Quelle première démarche est la plus solide ?", "The school wants to reduce lunch waste. Which first step is strongest?"),
    options: {
      a: option("Mesurer une semaine, discuter des causes puis tester une action", "Measure one week, discuss causes, then test an action"),
      b: option("Choisir une solution parce qu’elle est à la mode", "Choose a solution because it is fashionable"),
      c: option("Promettre zéro déchet dès demain", "Promise zero waste starting tomorrow"),
    },
    correctOptionId: "a",
    explanation: option("Mesurer, comprendre, tester puis réévaluer permet d’agir sans promettre un résultat impossible à garantir.", "Measuring, understanding, testing and reassessing supports action without promising an impossible result."),
    isTransfer: true,
  }),
  item({
    id: "atelier-post-transfert-source",
    pairId: "transfert-source",
    conceptId: "transfert-source",
    notion: option("Relier indicateur et limites", "Connect indicator and limits"),
    phase: "post-quiz",
    theme: "ecocitoyennete",
    type: "situation-probleme",
    prompt: option("Un graphique progresse, mais ne précise ni la période ni le nombre de participants. Que dire ?", "A chart improves but gives neither the period nor participant count. What should you say?"),
    options: {
      a: option("La tendance est intéressante, mais il manque un contexte pour conclure", "The trend is interesting, but context is missing before concluding"),
      b: option("Le graphique prouve que tout le monde a changé", "The chart proves everyone changed"),
      c: option("Le graphique est forcément faux", "The chart is necessarily false"),
    },
    correctOptionId: "a",
    explanation: option("Un indicateur peut être utile sans suffire : il faut connaître son périmètre, sa période et ses limites.", "An indicator can be useful without being sufficient: check its scope, period and limits."),
    isTransfer: true,
  }),
];

function isPublic(itemToCheck: QuizSchoolWorkshopAssessmentItem, level: QuizSchoolLevel): boolean {
  return itemToCheck.validationStatus === "validated" && !itemToCheck.needsReview && itemToCheck.allowedLevels.includes(level) && Boolean(itemToCheck.levelProfiles[level]);
}

function resolve(itemToResolve: QuizSchoolWorkshopAssessmentItem, level: QuizSchoolLevel): ResolvedQuizSchoolWorkshopAssessmentItem | null {
  const profile = itemToResolve.levelProfiles[level];
  if (!isPublic(itemToResolve, level) || !profile) return null;
  return { ...itemToResolve, difficulty: profile.difficulty, skills: profile.skills };
}

export function getQuizSchoolWorkshopAssessment(
  level: QuizSchoolLevel,
  phase: QuizSchoolWorkshopAssessmentPhase,
  items: readonly QuizSchoolWorkshopAssessmentItem[] = phase === "pre-quiz" ? PRE_ITEMS : POST_ITEMS,
): ResolvedQuizSchoolWorkshopAssessmentItem[] {
  const seenConcepts = new Set<string>();
  return items
    .filter((candidate) => candidate.phase === phase && isPublic(candidate, level))
    .filter((candidate) => {
      const key = phase === "pre-quiz" ? candidate.conceptId : candidate.id;
      if (seenConcepts.has(key)) return false;
      seenConcepts.add(key);
      return true;
    })
    .map((candidate) => resolve(candidate, level))
    .filter((candidate): candidate is ResolvedQuizSchoolWorkshopAssessmentItem => Boolean(candidate));
}

export function getQuizSchoolWorkshopAssessmentPairs(): ReadonlyArray<{
  conceptId: string;
  pre: QuizSchoolWorkshopAssessmentItem;
  post: QuizSchoolWorkshopAssessmentItem;
}> {
  return PRE_ITEMS.map((pre) => ({
    conceptId: pre.conceptId,
    pre,
    post: POST_ITEMS.find((post) => post.pairId === pre.pairId) ?? pre,
  }));
}

export function getQuizSchoolWorkshopAssessmentItemsForTesting(): ReadonlyArray<QuizSchoolWorkshopAssessmentItem> {
  return [...PRE_ITEMS, ...POST_ITEMS];
}
