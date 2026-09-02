# UI Quiz

Ce dossier contient la composition React du Quiz : écran principal, sélecteurs, panneaux de session, parcours scolaires, composants de progression et éléments visuels associés.

La famille `school/` regroupe les composants exclusivement scolaires : choix du niveau et du format, kit enseignant, guide de séance, banque détaillée et atelier `atelier-60`. `quiz-school-kit-page.tsx` reste le compositeur public de la fiche `/learn/ecole`; il ne porte plus le rendu détaillé des sections. La famille `session/` contient les contrôleurs d’état de session transverses, tandis que les panneaux génériques restent à la racine.

La logique, les contrats génériques, la taxonomy, la sélection, la progression et les audits sont dans `apps/web/src/lib/learning/quiz/`. Les contrats et règles propres au Mode École sont dans `apps/web/src/lib/learning/quiz/school/`. La direction autorisée est donc `components/learn/quiz/` vers le domaine Quiz ; le domaine ne doit jamais remonter vers cette UI.

La banque de questions reste dans `apps/web/data/environmental-quiz-bank.ts`, tandis que `environmental-quiz.tsx` conserve les réexports publics déjà consommés. Les nouveaux modules placés ici doivent être des composants ou de la composition visuelle ; une règle pédagogique pure doit rejoindre `lib/learning/quiz/`.

L’atelier `atelier-60` affiche dans son bilan les résultats collectifs avant/après,
les notions retenues ou fragiles, trois actions collège et jusqu’à trois
prolongements franciliens issus du registre validé du domaine École. La session
reste publique, anonyme et en mémoire ; aucun classement ou profil individuel
n’est affiché.

Les tests UI restent dans ce dossier avec le composant testé ou dans sa famille (`school/`). Les routes Learning importent la surface UI depuis ce dossier et n'importent pas directement les anciens chemins plats.
