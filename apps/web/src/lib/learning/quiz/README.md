# Domaine Quiz

Ce dossier porte la logique pédagogique pure du Quiz : contrats de questions et de sources, taxonomy, formats, niveaux de piège, cibles de révision, modes d'accès, sélection, progression, normalisation, audits et tests associés.

La banque assemblée reste dans `apps/web/data/environmental-quiz-bank.ts`. Le module de banque peut utiliser les contrats et règles de ce dossier, mais aucun fichier de `quiz/` ne doit importer un composant React.

La surface UI correspondante est `apps/web/src/components/learn/quiz/`. Elle consomme ce domaine pour afficher et orchestrer les sessions ; les questions, réponses, scoring, SRS et règles de sélection ne doivent pas être recréés dans cette surface.

Les tests restent avec la capacité qu'ils vérifient. Une nouvelle règle ou un nouveau contrat Quiz doit être ajouté ici, avec son test ciblé lorsqu'il existe une régression ou un invariant vérifiable.
