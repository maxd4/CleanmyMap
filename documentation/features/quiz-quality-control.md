# Contrôle qualité des questions du quiz

Ce document complète le guide d'authoring du quiz.

Il sert à bloquer les questions trop évidentes, trop scolaires ou trop proches d'un réflexe de bon sens.

La règle est simple.

Une question doit faire travailler une compétence réelle, pas seulement reconnaître un mot-clé ou choisir l'option la moins absurde.

## Grille de validation

| Critère | Ce qu'on attend | Signal d'alerte |
| --- | --- | --- |
| Intérêt pédagogique | La question corrige une idée reçue, explique un mécanisme ou fait comparer deux situations proches. | La question ne fait que redemander une évidence connue. |
| Niveau de réflexion demandé | L'utilisateur doit interpréter, arbitrer, estimer ou relier plusieurs indices. | La réponse sort du texte sans effort mental. |
| Caractère piégeux mais juste | Le piège reste crédible et les mauvaises réponses restent plausibles. | Les distracteurs sont caricaturaux ou absurdes. |
| Qualité de l'explication | L'explication ajoute un mécanisme, une conséquence ou une nuance utile. | L'explication répète seulement la bonne réponse. |
| Lien avec CleanMyMap | La question parle d'un sujet utile pour le tri, le terrain, l'impact, la méthode ou la biodiversité. | La question pourrait vivre dans n'importe quel autre produit. |
| Utilité terrain ou scientifique | La question sert une décision de terrain, une compréhension scientifique ou un raisonnement de méthode. | La question ressemble à un rappel scolaire isolé. |
| Absence de réponse évidente | Le bon choix ne doit pas être visible au premier coup d'œil. | Une seule option raisonnable saute aux yeux. |

## Traçabilité des sources

Chaque question sensible doit pouvoir être reliée à une source lisible.

Champs attendus:
- `sourceUrl`
- `sourceLabel`
- `sourceType`
- `confidenceLevel`
- `isLocalRule`
- `localScope`
- `lastCheckedAt`
- `needsReview`

Types de source autorisés:
- `institutionnelle`
- `scientifique`
- `associative`
- `presse`
- `interne`
- `estimation`

Niveaux de confiance:
- `élevé`
- `moyen`
- `faible`

Périmètres locaux:
- `national`
- `regional`
- `departemental`
- `communal`
- `variable`

Règles:
- les questions de sécurité, de tri, de pollution, de biodiversité et les questions chiffrées doivent porter une source;
- les questions fondées sur des ordres de grandeur doivent être étiquetées `estimation`;
- les consignes locales doivent être marquées `isLocalRule: true` et `localScope: variable` si elles changent selon le territoire;
- les questions de raisonnement terrain général peuvent rester plus ouvertes, mais elles doivent alors être marquées `needsReview: true`;
- les sources institutionnelles doivent être privilégiées quand une référence publique existe.

## Ce qui doit faire échouer une question

- Une formulation du type `que faire`, `que faut-il faire`, `quel est le bon réflexe`, `quelle est la bonne attitude` ou équivalent.
- Des mauvaises réponses absurdes, trop théâtrales ou trop faciles à éliminer.
- Une explication qui ne transmet aucun apprentissage supplémentaire.
- Une question sans mode, sans compétence ou sans fil d'erreur exploitable.
- Une question de difficulté élevée ou future `expert` qui reste évidente.

## Contrôle automatisé

L'audit automatique du dépôt se lance avec:

```bash
npm run audit:quiz-quality
```

L'audit dédié au sourcing et à la traçabilité se lance avec:

```bash
npm run audit:quiz-sources
```

Le test de non-régression associé est:

```bash
npm run test -w apps/web -- src/lib/learning/quiz-quality-audit.test.ts
```

Le test de non-régression du sourcing est:

```bash
npm run test -w apps/web -- src/lib/learning/quiz-source-audit.test.ts
```

Le contrôle automatisé ne remplace pas la relecture éditoriale.

Il bloque les formulations manifestement faibles et signale les questions à relire avant publication.

## Règle de décision

- Aucune erreur critique: la question peut entrer dans la banque.
- Au moins un avertissement: la question doit être relue avant ajout.
- Au moins une erreur: la question ne doit pas être ajoutée telle quelle.
