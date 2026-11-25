# S'entraîner : candidat de refonte Web

**Statut : PLAN / CANDIDATE.** Aucun code applicatif ni test runtime publié comme validé.

## Intention et périmètre

Base lue : `6a8ad6b4ea059da6ec91e86855a0430b11f4b176`. Vérification des chemins cibles sur `6a8ad6b4ea059da6ec91e86855a0430b11f4b176`. Ne pas imposer un checkout historique. Refondre uniquement `/learn/sentrainer` et ses écrans Quiz réellement consommés. La capture fournie est l'état initial à corriger, non une cible à reproduire.

Décision : EXTEND_EXISTING pour les owners Quiz et CREATE_MODULE pour le panneau individuel autonome. Retrait de l'introduction visuelle obsolète : unique consommateur runtime identifié sur cette route, test dédié supprimé et couvert par le nouveau contrat de page. La banque, la sélection, la correction, les calculs SRS, les métriques, la persistence, les autorisations et les paramètres d'entrée existants restent propriétaires de leurs comportements. Pas de nouvelle route, API, dépendance ou migration.

## Composition retenue

1. En-tête compact, sans panneau graphique factice ni CTA concurrent.
2. Quiz pleine largeur, en premier après le titre. Quatre onglets au clavier : Quiz individuel (initial), Ma progression, Mode École, Démo rapide. Tabulation roving, flèches, Home/End, panneaux associés et masqués ; pas de navigation d'onglet pendant une session.
3. Quiz individuel : piégeage Tous/Faible/Moyen/Fort, description du choix actif, mixte mis en avant, six parcours thématiques issus du registre existant, taille maximale réelle fournie par le moteur, niveau affiché seulement s'il existe. Aucun encart vide répété.
4. Progression : snapshot existant en densité complète, chargé à la demande ; état vide explicite et CTA vers le quiz. Pas de compteur ni historique inventé ; ne pas assimiler les bonnes réponses à une maîtrise attestée.
5. École : sélection de classe, format et collectif, lien kit enseignant, contrôles compacts et sélection visible. Démo : CTA distinct, comportement actuel sans enregistrement de progression.
6. Raisonnement : cartes moins hautes, accès aux explications méthodologiques et aux compteurs adaptatifs existants en détail repliable. Session : barre réelle et nombre de bonnes réponses, surface lisible ; retrait de la grande carte qui présentait le score comme des concepts maîtrisés et annonçait SRS actif même en démo. Les réponses, feedback, sources, bilans, actions, ateliers et mini-défis sont préservés.
7. Navigation secondaire du bloc compacte, après le quiz.

Les nouveaux panneaux utilisent les primitives CmmCard, CmmButton, les styles d'onglets de famille et les tokens sémantiques. Aucun second registre de couleurs : la palette jaune/orange plus claire est dans le candidat Vulgarisation (ou le runtime après son intégration). Les couleurs sémantiques des réponses et des états ne changent pas.

## Défauts démontrés dans le main de départ

- Grille `lg:grid-cols-2` avec un seul enfant : demi-largeur du quiz sur desktop.
- Résumé initial figé à 12 questions, répartitions et date de révision constantes, indépendamment des résultats réels.
- `handleSelectAccessType` efface le piégeage déjà choisi : les sélections individuelles doivent le conserver ; École et Démo continuent de le réinitialiser.
- Enveloppe de chargement à hauteur minimale de 760 px conservée après chargement ; placeholder vide.
- Score intermédiaire présenté comme maîtrise et pourcentage du total de la session, avec SRS actif même en démo.

## Application

Consulter [01-sentrainer.patch](./01-sentrainer.patch) et [MANIFEST.json](./MANIFEST.json). Depuis la racine du checkout courant, inspecter les chemins du manifeste, les fichiers dirty et staged des autres writers et la version Next effectivement installée, comme requis par AGENTS. Ne rien écraser.

```sh
git apply --check documentation/specs/sentrainer-ui/01-sentrainer.patch
git apply documentation/specs/sentrainer-ui/01-sentrainer.patch
```

Deux chemins sont partagés avec `documentation/specs/vulgarisation-ui/` : `learn-deferred-panels.tsx` et son test. Les hunks de S'entraîner portent exclusivement sur le quiz ; ceux de Vulgarisation sur les autres modules. Rejeu textuel dans les deux ordres : même résultat. Intégrer les deux candidats de façon coordonnée, jamais remplacer un fichier partagé en entier ou imposer les anciens blobs. Les empreintes du manifeste correspondent à ce candidat isolé ; le SHA final des deux fichiers partagés change après composition. En cas de conflit réel ou d'échec du contrôle, inspecter et rapprocher seulement les hunks compatibles, sans écraser un autre writer.

## Vérifications à exécuter sur le checkout

- Tests ciblés de la page, picker (rendu, navigation, états, délégation des actions), hook de mode (conservation du piégeage et reset école/démo), chargements différés, reasoning picker, session, résumé, sélection et école. Préserver les assertions utiles des anciens tests, dont l'affichage d'un niveau réel dans le picker et l'accès au kit.
- `npm run typecheck -w apps/web`, lint Web et contrôles documentaires concernés ; vérifier le périmètre Learning, mesurer la couverture pertinente Web. Contrôler les éventuelles baselines de complexité devenues stale sans les assouplir ni masquer un finding. Ne pas lancer FULL sans demande dédiée.
- Vérifier sur navigateur : route PUBLIC (sans compte pour démo/école, contexte Clerk Development adapté au runtime), session individuelle authentifiée si nécessaire via harness canonique, FR/EN, 390 px et desktop 1440/1920, modes minimaliste/sobre/exhaustif, contraste et focus. Tester tabulation, flèches/Home/End, changement de filtre puis choix mixte/thème, progression absente/réelle, deep links école et démo, 30/60 min, collectif, correction, reprise, bilan et non-persistence école/démo. Vérifier qu'aucun panneau vide ne s'affiche, que les labels et actions sont utilisables, et qu'aucune demi-largeur ne subsiste. Captures avant/après et preuves des comportements.
- Préserver l'ancre `#quiz-architecture` et les consommateurs de quiz. Vérifier les classes de cartes et des boutons au rendu, corriger uniquement les défauts du lot ; ne pas modifier le moteur hors correction du reset de piégeage démontré.

## Preuves et limites

Contrôles statiques réalisés : lecture des owners/callers/tests, comparaison des blobs et absence des nouveaux chemins, reconstruction et rejeu textuel des hunks vers les empreintes attendues, vérification des deux recouvrements, UTF-8 et recherche ciblée de secrets. Ces contrôles ne prouvent ni une compilation TypeScript ni le comportement runtime.

`HOOK_NOT_AVAILABLE` pour la publication documentaire distante. `git apply --check` réel, lint, typecheck, Vitest, navigateur et couverture : NOT_RUN / NOT_MEASURED. Les tests ajoutés sont candidats, non exécutés. Aucune preuve de déploiement.

**STOP CONDITION** : intégration des modifications compatibles, tests et preuves runtime proportionnés réussis, captures desktop/mobile et validation des trois modes d'affichage, documentation CURRENT actualisée dans le même lot, commit fast-forward sur main et relecture. Retirer uniquement le dossier temporaire de ce candidat et sa référence dans l'index après consommation effective ; préserver le candidat Vulgarisation tant qu'il n'est pas consommé.
