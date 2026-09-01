import type { SupportedLocale } from "@/lib/learning/cognitive-principles";

export type QuizLocalizedText = {
  fr: string;
  en?: string;
};

export type QuizLocalizedTextList = {
  fr: readonly string[];
  en?: readonly string[];
};

export type QuizQuestionLocalizedFields = {
  question?: QuizLocalizedText;
  options?: QuizLocalizedTextList;
  explanation?: QuizLocalizedText;
  takeaway?: QuizLocalizedText;
  feedbackCorrect?: QuizLocalizedText;
  feedbackWrong?: QuizLocalizedText;
  misconception?: QuizLocalizedText;
  sourceLabel?: QuizLocalizedText;
};

export type QuizUiCopyKey =
  | "access.bannerLabel"
  | "access.title"
  | "access.description"
  | "session.school.bannerLabel"
  | "session.school.collectiveBadge"
  | "session.school.progressText"
  | "session.school.animationStepReflection"
  | "session.school.animationStepVote"
  | "session.school.animationStepReveal"
  | "session.school.promptHidden"
  | "session.school.promptCollective"
  | "session.school.promptIndividual"
  | "session.school.revealChoices"
  | "session.school.revealAnswer"
  | "session.school.previousQuestion"
  | "session.school.nextQuestion"
  | "session.school.finishWorkshop"
  | "session.school.restartWorkshop"
  | "session.school.atRetenir"
  | "session.school.scoreLabel"
  | "session.school.notionsLabel"
  | "session.school.errorsLabel"
  | "session.school.messagesLabel"
  | "session.school.recommendedModeLabel"
  | "session.school.masteredSkillsLabel"
  | "session.school.skillsToReviewLabel"
  | "session.school.revisionLabel"
  | "session.modeToReplayLabel"
  | "session.errorTypesLabel"
  | "session.school.sessionLabel"
  | "session.school.workshopTitle"
  | "session.adaptiveTitle"
  | "session.progressSchoolLabel"
  | "session.progressSessionLabel"
  | "session.collectiveChip"
  | "session.individualChip"
  | "session.hiddenChoicesLabel"
  | "session.streakLabel"
  | "session.masteryLabel"
  | "session.sourceLabel"
  | "session.localRuleLabel"
  | "session.reviewedLabel"
  | "session.reviewedAtLabel"
  | "session.explanationLabel"
  | "session.feedbackLabel"
  | "session.expectedAnswersLabel"
  | "session.reviewTargetLabel"
  | "session.checkAnswer"
  | "session.viewSummary"
  | "session.demo.bannerLabel"
  | "session.demo.bannerText"
  | "session.sessionTitle"
  | "session.schoolTitle"
  | "session.schoolSubtitle"
  | "session.replaySession"
  | "session.progressLabel"
  | "session.loadingDemo"
  | "session.loadingSchool"
  | "session.loadingAdaptive"
  | "session.noQuestion"
  | "session.changeReasoning"
  | "session.changeType"
  | "access.school.bannerLabel"
  | "access.school.ctaLabel"
  | "access.school.ctaTitle"
  | "access.school.ctaText"
  | "access.demo.bannerLabel"
  | "access.demo.ctaLabel"
  | "access.demo.ctaTitle"
  | "access.demo.ctaText"
  | "access.sessionShort"
  | "access.questionsByMode"
  | "access.questionsMixedMode"
  | "access.trapModeLabel"
  | "access.trapModeTitle"
  | "access.trapModeDescription"
  | "access.trapModeAll"
  | "access.currentLevel"
  | "access.noSession"
  | "access.footerNote"
  | "access.mixte.label"
  | "access.ecole.label"
  | "access.terrain.label"
  | "access.donnees-scientifiques.label"
  | "access.sensibilisation.label"
  | "access.habitudes-de-vie.label"
  | "access.ordres-de-grandeur.label"
  | "access.tri-securite.label"
  | "school.back"
  | "school.bannerLabel"
  | "school.title"
  | "school.description"
  | "school.collectiveTitle"
  | "school.collectiveDescription"
  | "school.collective.enabled"
  | "school.collective.disabled"
  | "school.linkTeacherKit"
  | "school.levelPrompt"
  | "school.levelNote"
  | "school.level.6e.label"
  | "school.level.6e.description"
  | "school.level.5e.label"
  | "school.level.5e.description"
  | "school.level.4e.label"
  | "school.level.4e.description"
  | "school.level.3e.label"
  | "school.level.3e.description"
  | "school.levelChip"
  | "school.durationLabel"
  | "school.questionsLabel"
  | "school.takeawayLabel"
  | "school.debat-classe.label"
  | "school.mission-terrain.label"
  | "school.ordres-de-grandeur.label"
  | "school.gestes-du-quotidien.label";

export const QUIZ_UI_COPY: Record<QuizUiCopyKey, QuizLocalizedText> = {
  "access.bannerLabel": { fr: "Accès au quiz", en: "Quiz access" },
  "access.title": { fr: "Choisissez ce que vous voulez évaluer", en: "Choose what you want to assess" },
  "access.description": {
    fr: "Choisissez d’abord le mode. La session reste courte, ciblée et limitée à un nombre raisonnable de questions.",
    en: "Choose a mode first. Sessions stay short, focused and capped at a reasonable number of questions.",
  },
  "session.school.bannerLabel": { fr: "Mode École" },
  "session.school.collectiveBadge": { fr: "Mode collectif" },
  "session.school.progressText": {
    fr: "Une question, un vote, une discussion, puis une réponse courte à retenir.",
  },
  "session.school.animationStepReflection": { fr: "1. Temps de réflexion individuel" },
  "session.school.animationStepVote": { fr: "2. Vote à main levée ou débat oral" },
  "session.school.animationStepReveal": { fr: "3. Révélation de la bonne réponse" },
  "session.school.promptHidden": {
    fr: "Laissez d’abord la classe réfléchir, puis affichez les réponses pour lancer le vote.",
  },
  "session.school.promptCollective": {
    fr: "Laissez d’abord la classe réfléchir, puis affichez les réponses avant de révéler la bonne.",
  },
  "session.school.promptIndividual": {
    fr: "Répondez puis révélez la correction immédiatement.",
  },
  "session.school.revealChoices": { fr: "Afficher les réponses" },
  "session.school.revealAnswer": { fr: "Révéler la bonne réponse" },
  "session.school.previousQuestion": { fr: "Question précédente" },
  "session.school.nextQuestion": { fr: "Question suivante" },
  "session.school.finishWorkshop": { fr: "Terminer l’atelier" },
  "session.school.restartWorkshop": { fr: "Recommencer l’atelier" },
  "session.school.atRetenir": { fr: "À retenir" },
  "session.school.scoreLabel": { fr: "Score", en: "Score" },
  "session.school.notionsLabel": { fr: "Notions vues", en: "Notions covered" },
  "session.school.errorsLabel": { fr: "Erreurs fréquentes", en: "Common errors" },
  "session.school.messagesLabel": { fr: "Messages clés", en: "Key messages" },
  "session.school.recommendedModeLabel": { fr: "Mode conseillé", en: "Recommended mode" },
  "session.school.masteredSkillsLabel": { fr: "Compétences maîtrisées", en: "Mastered skills" },
  "session.school.skillsToReviewLabel": { fr: "Compétences à revoir", en: "Skills to review" },
  "session.school.revisionLabel": { fr: "Revoir cette notion", en: "Review this notion" },
  "session.modeToReplayLabel": { fr: "Mode à rejouer", en: "Mode to replay" },
  "session.errorTypesLabel": { fr: "Types d'erreurs fréquentes", en: "Frequent error types" },
  "session.school.sessionLabel": { fr: "Bilan de l’atelier", en: "Workshop recap" },
  "session.school.workshopTitle": { fr: "Atelier en classe", en: "Class workshop" },
  "session.adaptiveTitle": { fr: "Apprentissage Adaptatif", en: "Adaptive learning" },
  "session.progressSchoolLabel": { fr: "Progression de l’atelier", en: "Workshop progress" },
  "session.progressSessionLabel": { fr: "Progression de la session", en: "Session progress" },
  "session.collectiveChip": { fr: "Collectif", en: "Collective" },
  "session.individualChip": { fr: "Individuel", en: "Individual" },
  "session.streakLabel": { fr: "Série", en: "Streak" },
  "session.masteryLabel": { fr: "Maîtrise", en: "Mastery" },
  "session.hiddenChoicesLabel": { fr: "Réponses masquées", en: "Hidden answers" },
  "session.sourceLabel": { fr: "Source", en: "Source" },
  "session.localRuleLabel": { fr: "Règle locale", en: "Local rule" },
  "session.reviewedLabel": { fr: "À relire", en: "Needs review" },
  "session.reviewedAtLabel": { fr: "Vérifiée le", en: "Checked on" },
  "session.explanationLabel": { fr: "Explication pédagogique", en: "Pedagogical explanation" },
  "session.feedbackLabel": { fr: "Retour pédagogique", en: "Pedagogical feedback" },
  "session.expectedAnswersLabel": { fr: "Réponses attendues", en: "Expected answers" },
  "session.reviewTargetLabel": { fr: "À revoir dans", en: "Review in" },
  "session.checkAnswer": { fr: "Vérifier la réponse", en: "Check answer" },
  "session.viewSummary": { fr: "Voir le bilan", en: "View summary" },
  "session.demo.bannerLabel": { fr: "Mode démo" },
  "session.demo.bannerText": {
    fr: "Session courte de cinq questions, sans compte obligatoire, pour présenter rapidement la valeur pédagogique du quiz.",
  },
  "session.sessionTitle": { fr: "Bilan de session" },
  "session.schoolTitle": { fr: "Bilan de l’atelier" },
  "session.schoolSubtitle": {
    fr: "Ce bilan reste simple: score, notions vues, erreurs fréquentes et messages clés pour repartir avec l’essentiel.",
  },
  "session.replaySession": { fr: "Recommencer" },
  "session.progressLabel": { fr: "Progression de la session", en: "Session progress" },
  "session.loadingDemo": { fr: "Préparation de la démonstration...", en: "Preparing the demo session..." },
  "session.loadingSchool": { fr: "Préparation de l’atelier de classe...", en: "Preparing the classroom workshop..." },
  "session.loadingAdaptive": {
    fr: "Préparation de la session de raisonnement...",
    en: "Preparing the reasoning session...",
  },
  "session.noQuestion": {
    fr: "Aucune question disponible pour ce type de quiz et ce type de raisonnement.",
    en: "No question is available for this quiz type and reasoning type.",
  },
  "session.changeReasoning": { fr: "Changer de raisonnement", en: "Change reasoning" },
  "session.changeType": { fr: "Changer de type", en: "Change type" },
  "access.school.bannerLabel": { fr: "Mode École" },
  "access.school.ctaLabel": { fr: "Lancer le mode École" },
  "access.school.ctaTitle": { fr: "Séance publique pour la 6e à la 3e", en: "Public session for grades 6 to 9" },
  "access.school.ctaText": {
    fr: "Séance collective de 30 minutes, sans compte, avec un niveau choisi avant le lancement.",
    en: "A 30-minute collective session with no account and a grade chosen before launch.",
  },
  "access.demo.bannerLabel": { fr: "Démo rapide" },
  "access.demo.ctaLabel": { fr: "Lancer la démo" },
  "access.demo.ctaTitle": { fr: "Montrer le quiz en moins de cinq questions" },
  "access.demo.ctaText": {
    fr: "Session courte, sans compte obligatoire, avec un parcours représentatif: terrain, idée reçue, ordre de grandeur, sécurité ou tri, puis impact local.",
  },
  "access.sessionShort": { fr: "Session courte", en: "Short session" },
  "access.questionsByMode": { fr: "questions par mode", en: "questions per mode" },
  "access.questionsMixedMode": { fr: "questions en mixte", en: "questions in mixed mode" },
  "access.trapModeLabel": { fr: "Mode de piège", en: "Trap mode" },
  "access.trapModeTitle": { fr: "Niveau de piégeage", en: "Trap level" },
  "access.trapModeDescription": {
    fr: "Choisissez si vous voulez des questions plus directes ou plus piégeuses en intuition.",
    en: "Choose whether you want more direct questions or questions that are more intuitive traps.",
  },
  "access.trapModeAll": { fr: "Tous", en: "All" },
  "access.currentLevel": { fr: "Niveau actuel" },
  "access.noSession": { fr: "Aucune séance sur ce mode." },
  "access.footerNote": {
    fr: "Les formats détaillés du quiz s’appliquent ensuite selon le type choisi.",
    en: "Detailed quiz formats then apply according to the selected type.",
  },
  "access.mixte.label": { fr: "Mixte", en: "Mixed" },
  "access.ecole.label": { fr: "École", en: "School" },
  "access.terrain.label": { fr: "Terrain", en: "Field" },
  "access.donnees-scientifiques.label": { fr: "Données scientifiques", en: "Scientific data" },
  "access.sensibilisation.label": { fr: "Sensibilisation", en: "Awareness" },
  "access.habitudes-de-vie.label": { fr: "Habitudes de vie", en: "Daily habits" },
  "access.ordres-de-grandeur.label": { fr: "Ordres de grandeur", en: "Orders of magnitude" },
  "access.tri-securite.label": { fr: "Tri & sécurité", en: "Sorting & safety" },
  "school.back": { fr: "Revenir aux autres modes", en: "Back to other modes" },
  "school.bannerLabel": { fr: "Mode École", en: "School mode" },
  "school.title": { fr: "Choisissez le niveau de la séance", en: "Choose the session level" },
  "school.description": {
    fr: "Une séance publique de 30 minutes pour la 6e, la 5e, la 4e ou la 3e. Les questions sont équilibrées automatiquement et les catégories restent internes.",
    en: "A 30-minute public session for grades 6 to 9. Questions are balanced automatically and categories remain internal.",
  },
  "school.collectiveTitle": { fr: "Mode collectif recommandé", en: "Recommended collective mode" },
  "school.collectiveDescription": {
    fr: "L’enseignant affiche la question, fait voter ou débattre la classe, puis révèle la réponse.",
    en: "The teacher shows the question, invites a vote or discussion, then reveals the answer.",
  },
  "school.collective.enabled": { fr: "Mode collectif activé", en: "Collective mode enabled" },
  "school.collective.disabled": { fr: "Mode collectif désactivé", en: "Collective mode disabled" },
  "school.linkTeacherKit": { fr: "Voir le kit enseignant", en: "View teacher kit" },
  "school.levelPrompt": { fr: "Choisissez une classe avant de lancer", en: "Choose a grade before launching" },
  "school.levelNote": {
    fr: "Le parcours mélange automatiquement les quatre catégories de questions. Aucun compte, nom d’élève ou classe à créer.",
    en: "The path automatically mixes the four question categories. No account, student name or class to create.",
  },
  "school.level.6e.label": { fr: "6e", en: "Grade 6" },
  "school.level.6e.description": { fr: "Repères concrets et questions directes pour démarrer.", en: "Concrete cues and direct questions to get started." },
  "school.level.5e.label": { fr: "5e", en: "Grade 7" },
  "school.level.5e.description": { fr: "Premières comparaisons et conséquences à relier.", en: "First comparisons and consequences to connect." },
  "school.level.4e.label": { fr: "4e", en: "Grade 8" },
  "school.level.4e.description": { fr: "Un équilibre entre mécanismes, terrain et raisonnement.", en: "A balance of mechanisms, field situations and reasoning." },
  "school.level.3e.label": { fr: "3e", en: "Grade 9" },
  "school.level.3e.description": { fr: "Des situations plus nuancées pour argumenter et estimer.", en: "More nuanced situations for arguing and estimating." },
  "school.levelChip": { fr: "Niveau", en: "Level" },
  "school.durationLabel": { fr: "30 min", en: "30 min" },
  "school.questionsLabel": { fr: "15 questions", en: "15 questions" },
  "school.takeawayLabel": { fr: "À retenir", en: "Key takeaway" },
  "school.debat-classe.label": { fr: "Débat en classe", en: "Class debate" },
  "school.mission-terrain.label": { fr: "Mission terrain", en: "Field mission" },
  "school.ordres-de-grandeur.label": { fr: "Ordres de grandeur", en: "Orders of magnitude" },
  "school.gestes-du-quotidien.label": { fr: "Gestes du quotidien", en: "Daily habits" },
};

export function getQuizLocalizedText(locale: SupportedLocale, value: QuizLocalizedText): string {
  return value[locale] ?? value.fr;
}

export function getQuizLocalizedTextList(locale: SupportedLocale, value: QuizLocalizedTextList): readonly string[] {
  return value[locale] ?? value.fr;
}

export function getQuizLocalizedTextFallback(
  locale: SupportedLocale,
  value: QuizLocalizedText | undefined,
  fallback: string,
): string {
  return value ? getQuizLocalizedText(locale, value) : fallback;
}

export function getQuizLocalizedTextListFallback(
  locale: SupportedLocale,
  value: QuizLocalizedTextList | undefined,
  fallback: readonly string[],
): readonly string[] {
  return value ? getQuizLocalizedTextList(locale, value) : fallback;
}

export function getQuizUiCopy(locale: SupportedLocale, key: QuizUiCopyKey): string {
  return getQuizLocalizedText(locale, QUIZ_UI_COPY[key]);
}
