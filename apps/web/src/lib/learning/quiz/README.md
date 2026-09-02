# Domaine Quiz

Ce dossier porte la logique pédagogique générique du Quiz : contrats de questions et de sources, taxonomy, formats, niveaux de piège, cibles de révision, modes d'accès, sélection, progression, normalisation, audits et tests associés.

La capacité scolaire autonome vit dans `apps/web/src/lib/learning/quiz/school/` : contrats de niveaux et formats, éligibilité par niveau, tracks internes, kit pédagogique, activités pédagogiques, composition déterministe de la séquence de 30 minutes, état `atelier-60` et tests scolaires associés. Son contrat est consommé par les moteurs génériques sans déplacer ces moteurs dans le sous-domaine scolaire.

La banque assemblée reste dans `apps/web/data/environmental-quiz-bank.ts`. Le module de banque peut utiliser les contrats et règles de ce dossier, mais aucun fichier de `quiz/` ne doit importer un composant React.

La surface UI correspondante est `apps/web/src/components/learn/quiz/`. Elle consomme ce domaine pour afficher et orchestrer les sessions ; les questions, réponses, scoring, SRS et règles de sélection ne doivent pas être recréés dans cette surface.

Les tests restent avec la capacité qu'ils vérifient : les tests scolaires sont sous `quiz/school/`, les tests mixtes du moteur restent dans `quiz/`. Une nouvelle règle ou un nouveau contrat Quiz doit être ajouté dans le module concerné, avec son test ciblé lorsqu'il existe une régression ou un invariant vérifiable.
