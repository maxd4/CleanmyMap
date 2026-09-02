# UI Quiz

Ce dossier contient la composition React du Quiz : écran principal, sélecteurs, panneaux de session, parcours scolaires, composants de progression et éléments visuels associés.

La logique, les contrats génériques, la taxonomy, la sélection, la progression et les audits sont dans `apps/web/src/lib/learning/quiz/`. Les contrats et règles propres au Mode École sont dans `apps/web/src/lib/learning/quiz/school/`. La direction autorisée est donc `components/learn/quiz/` vers le domaine Quiz ; le domaine ne doit jamais remonter vers cette UI.

La banque de questions reste dans `apps/web/data/environmental-quiz-bank.ts`, tandis que `environmental-quiz.tsx` conserve les réexports publics déjà consommés. Les nouveaux modules placés ici doivent être des composants ou de la composition visuelle ; une règle pédagogique pure doit rejoindre `lib/learning/quiz/`.

Les tests UI restent dans ce dossier avec le composant testé. Les routes Learning importent la surface UI depuis ce dossier et n'importent pas directement les anciens chemins plats.
