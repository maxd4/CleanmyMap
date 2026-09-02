# Domaine Learning

Ce dossier contient les modules de domaine, contrats et règles partagées par les surfaces Learning. Il ne dépend pas des composants React de `apps/web/src/components/learn/`.

## Organisation

- `quiz/` regroupe les contrats génériques, la logique pédagogique partagée, la taxonomy, la sélection, la progression, les audits et les tests du Quiz.
- `quiz/school/` regroupe la capacité École : niveaux `6e | 5e | 4e | 3e`, formats scolaires, éligibilité, tracks internes, kit, activités, évaluation pré/post, bilan collectif, registre territorial et tests associés. Voir son [README](quiz/school/README.md).
- `gestes-propres/` regroupe les données éditoriales et validations de la capacité Gestes Propres.
- `practice/themes.ts` contient le contrat neutre et l'ordre des thèmes de pratique.
- Les autres fichiers à la racine portent les primitives Learning transverses, le progrès global, les ressources, le compost ou les ordres de grandeur lorsqu'ils ne forment pas une famille plus étroite.

## Direction des dépendances

Les composants de `apps/web/src/components/learn/` peuvent consommer les modules de ce dossier. L'inverse est interdit : aucun module sous `lib/learning/` ne doit importer `components/learn/`, par alias ou par chemin relatif.

Le domaine Quiz est distinct de son UI : les règles et contrats génériques vivent dans `quiz/`, les règles propres à École dans `quiz/school/`, tandis que la composition React vit dans `apps/web/src/components/learn/quiz/`.

La banque de questions reste à son emplacement de données explicite : `apps/web/data/environmental-quiz-bank.ts`. Elle doit dépendre uniquement des contrats et de la logique du domaine Learning.

## Règles de placement futures

Ajouter dans `quiz/` toute nouvelle règle, contrat, taxonomy, sélection, progression, audit ou test générique qui appartient au Quiz. Ajouter dans `quiz/school/` ce qui est purement scolaire et dans `components/learn/quiz/` uniquement la composition React et les éléments de rendu Quiz. Créer un sous-dossier seulement pour une capacité cohérente, pas pour isoler un fichier unique sans frontière claire.
