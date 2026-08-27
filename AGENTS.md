# AGENTS.md — CleanMyMap

## Portée

Ce fichier définit les règles obligatoires pour tout agent IA intervenant sur le dépôt CleanMyMap.

Ordre de priorité :

1. consigne explicite de l'utilisateur ;
2. sécurité, données et authentification ;
3. état réel du dépôt GitHub `maxd4/CleanmyMap` ;
4. architecture et contrats existants ;
5. design system ;
6. tests et validation ;
7. simplicité ;
8. performance et quotas lorsque le sujet est concerné.

Ne jamais préférer une refonte large à une correction ciblée suffisante.

## Canari de session

Commencer uniquement la réponse finale par :

`Maxence —`

Les mises à jour intermédiaires ne doivent pas commencer par ce canari.

---

## 1. Source de vérité et politique GitHub

### GitHub

- Utiliser GitHub comme source de vérité.
- Lecture libre du dépôt.
- Le checkout de travail par défaut est directement `main`.
- Après autorisation explicite de l'utilisateur, committer directement sur `main`.
- Après les validations pertinentes, pousser directement vers `origin/main`.
- À chaque fin d’exécution de message ayant produit des modifications, créer le commit dédié et pousser vers `origin/main`; ne déroger qu’en cas de consigne explicite contraire ou de blocage signalé.
- Ne pas créer de Pull Request pour le développement courant.
- Ne créer une branche temporaire que sur demande explicite de l'utilisateur.
- Ne créer un worktree que sur demande explicite de l'utilisateur.
- Ne jamais pousser avec `--force` ni réécrire l'historique publié de `main`.
- Vérifier le diff exact du périmètre logique à committer et les validations
  pertinentes avant un push.
- Sans autorisation explicite, rester en lecture seule.

### Worktree parallèle et périmètre de commit

- Le worktree peut rester `dirty` en permanence : plusieurs chantiers peuvent
  s'exécuter en parallèle dans le même checkout.
- Les modifications `staged`, `unstaged` ou `untracked` qui sont étrangères au
  chantier courant ne sont ni un blocage ni une réserve de verdict. Ne pas les
  corriger, nettoyer, stasher, sauvegarder, déplacer ou inventorier
  systématiquement.
- Chaque exécution délimite son périmètre logique, modifie uniquement ce
  périmètre et stage uniquement les fichiers nécessaires à son commit. Ne pas
  utiliser une opération de staging globale qui pourrait inclure un autre
  chantier.
- Ne signaler l'état parallèle du worktree que s'il provoque une interférence
  concrète : même fichier modifié de manière incompatible, fichier étranger
  effectivement inclus dans le commit, impossibilité de produire le commit ou
  le push demandé, risque réel d'écrasement, ou nécessité exceptionnelle d'une
  opération Git destructive. Dans ce cas seulement, décrire brièvement le
  conflit précis et son impact.

### Attribution des validations en worktree parallèle

- Une erreur de test, de typecheck, de lint ou de build qui est
  identifiable comme provenant de modifications étrangères au périmètre
  courant est classée `SKIPPED_PARALLEL_CHANTIER`. Elle ne bloque pas le lot :
  ne pas la corriger, attendre la fin de l'autre chantier ou relancer une
  suite complète uniquement pour obtenir un état différent.
- Un échec est bloquant seulement s'il concerne un fichier ou un contrat
  modifié par le lot courant, s'il est causé par ce changement, ou s'il
  reproduit une régression réellement présente sur le `main` GitHub publié et
  pertinente pour le périmètre traité.
- Prioriser les tests métier ciblés et l'union dédupliquée des tests de
  sécurité/régression pertinents. Exécuter typecheck, lint et build tant que
  leurs résultats restent attribuables au lot courant ; interrompre cette
  validation au premier échec clairement étranger au lot.
- Ne pas relancer une full suite pour attendre un chantier parallèle. Le
  compte rendu sépare toujours `VALIDATIONS_DU_LOT` et
  `SKIPPED_PARALLEL_CHANTIER`, avec la cause et le fichier concernés lorsqu'un
  contrôle est classé ainsi.

### Répartition du travail

Le checkout local sert au travail courant, mais il ne doit pas contredire l'état de GitHub.

Avant toute analyse, réécriture, création ou modification visant un fichier précis du dépôt :

1. lire la version actuelle du fichier local ou GitHub ;
2. inspecter les dépendances directes utiles ;
3. ne pas se fier uniquement à une ancienne conversation, un ancien plan ou une copie locale potentiellement obsolète ;
4. signaler toute divergence entre documentation, code et configuration.

Dépôt de référence :

```txt
maxd4/CleanmyMap
```

Branche de référence par défaut :

```txt
main
```

### Agents d'analyse et de conception externes

Un agent utilisé pour l'analyse, la rédaction ou la conception peut :

- lire GitHub ;
- analyser les fichiers ;
- produire des versions complètes corrigées ;
- joindre des fichiers prêts à intégrer.

Il ne doit jamais écrire sans autorisation explicite de l'utilisateur. Quand l'écriture est autorisée, le travail validé est intégré directement sur `main`, committé puis poussé vers `origin/main` selon les garde-fous du dépôt, sans branche temporaire ni Pull Request.

### Intégrateur local

L’intégrateur local, notamment Codex, intervient principalement pour :

- vérifier la cohérence avec le checkout local complet ;
- intégrer les fichiers fournis ;
- exécuter les validations ;
- propager les changements transversaux nécessaires ;
- signaler les conflits avec le code réel.

Sans autorisation explicite, l’intégrateur reste en lecture seule.

Quand l'utilisateur autorise une écriture, le flux attendu est :

- vérifier que le checkout est sur `main` et définir le périmètre logique du lot ;
- modifier de manière ciblée ;
- exécuter les tests et garde-fous pertinents ;
- committer directement sur `main` ;
- pousser vers `origin/main` sans `--force` ;
- vérifier que `main` et `origin/main` désignent le même SHA.

---

## 2. Règles strictes de travail local

### Interdiction des dépôts parallèles

Il est interdit de créer sans autorisation explicite :

- un dossier sibling du dépôt ;
- une copie complète du projet ;
- un worktree ;
- `.worktrees/*` ;
- `worktrees/*` ;
- tout dossier `CleanmyMap-*` ou `CleanmyMap-main-*` parallèle.

Tout travail local doit rester dans :

```txt
C:\Users\sophi\Desktop\MAXENCE\business\CleanmyMap-main
```

### Hygiène de la racine

Ne pas créer de nouveau fichier racine sans demande explicite.

Placer les fichiers temporaires, captures, logs, exports et artefacts dans un dossier adapté :

- `artifacts/`
- `documentation/`
- `backups/`
- un sous-dossier technique existant.

Ne pas créer de miroir manuel pour contourner une règle d'emplacement.

### Installation des skills tiers

Les skills propres à CleanMyMap et volontairement versionnés restent limités
aux emplacements racine suivants : `.agents/skills/` est la source canonique et
`.codex/skills/` son miroir Codex gouverné. Les skills tiers locaux, notamment
ceux provenant de Vercel, Upstash ou d'un autre fournisseur, ne doivent jamais
être installés dans le checkout ni dans l'un de ses sous-dossiers.

La CLI `skills` réellement utilisée par le poste supporte officiellement
`npx skills add <package> --global` pour une installation au niveau utilisateur.
Son emplacement utilisateur global reconnu pour Codex est
`%USERPROFILE%\.agents\skills` (par exemple
`C:\Users\sophi\.agents\skills`), et non `apps/web/.agents/`. Avant toute
commande Vercel ou intégration susceptible d'exécuter automatiquement
`npx skills add`, vérifier sa destination et forcer ce mode utilisateur/global.

Un skill tiers ne peut entrer dans `.agents/skills/` racine que si l'utilisateur
décide explicitement de le versionner comme dépendance documentaire du projet.
Ne pas ajouter ces chemins au `.gitignore` : une installation accidentelle doit
rester visible et faire échouer `npm run check:agent-skills`.

### Dossiers protégés

Ne pas modifier, déplacer, supprimer, renommer ou dupliquer sans demande explicite :

```txt
documentation/pepite/
```

---

## 3. Stack réelle et structure

La version exacte des dépendances est définie par les manifestes, en particulier `apps/web/package.json`.

Repères actuels :

- Next.js 16 avec App Router ;
- React 19 ;
- TypeScript 7 ;
- Tailwind CSS 4 ;
- Clerk pour l'identité principale ;
- Supabase/PostgreSQL pour les données ;
- Vercel pour le déploiement web ;
- Expo/React Native pour `companion-app`.

Ne jamais recopier une version précise dans plusieurs documents sans nécessité. Quand la précision importe, lire le manifeste.

### Chemins structurants

```txt
apps/web/src/app/                         pages et routes API
apps/web/src/components/                  UI
apps/web/src/components/sections/rubriques/ modules fonctionnels
apps/web/src/lib/                         domaine, services et contrats
apps/web/src/lib/domain-language.ts       Role, SessionRole, Parcours
apps/web/src/lib/sections-registry/config.ts registre des rubriques
apps/web/supabase/                        configuration Supabase active du workspace web
apps/web/supabase/migrations/             migrations utilisées par le CLI du workspace web
companion-app/                            application mobile expérimentale
scripts/                                  garde-fous et maintenance Node
maintenance/python/                       maintenance Python hors runtime principal
documentation/                            documentation structurée
```

`apps/web/supabase/migrations/` est l'unique arbre de migrations éditable.
Ne pas créer ou réintroduire `supabase/migrations/`; le garde-fou
`npm run audit:supabase-migration-trees` bloque ce second arbre.

## Suppression et dead-code

L'absence de consommateur ou d'import runtime n'est pas, à elle seule, une
preuve qu'un module peut être supprimé. Avant de supprimer un fichier ou un
module apparemment inutilisé, vérifier s'il contient une connaissance métier,
pédagogique, de sécurité ou réglementaire, une configuration, une migration,
une compatibilité historique, une fixture ou une documentation unique.

Rechercher son successeur et migrer explicitement toute valeur utile avant la
suppression. Ne conserver aucun doublon lorsque son contenu est déjà porté par
une source canonique ; préserver en revanche les compatibilités et artefacts
historiques dont l'usage est encore démontré.

### Suppression d'artefacts non suivis

Ne jamais supprimer en masse des fichiers `untracked`, non canoniques ou
générés sur ce seul critère. Avant toute suppression d'un ensemble significatif
de fichiers non suivis, identifier et documenter :

- leur provenance et l'outil ou la commande qui les a créés ;
- leur rôle runtime, développement, documentation ou configuration ;
- leur caractère régénérable et leur emplacement attendu.

Appliquer une vigilance renforcée aux dossiers `.agents`, `.codex`, aux fichiers
`skills-lock.json`, aux intégrations Vercel et aux artefacts produits par les
outils de développement. En cas de doute, conserver les fichiers et produire
d'abord un verdict explicite `KEEP / MOVE / REINSTALL_ELSEWHERE / DELETE`, avec
les preuves qui le justifient. Une absence d'import ou de suivi Git ne constitue
jamais, seule, une preuve suffisante de suppression. Aucun nettoyage destructif
ne doit viser un chantier parallèle.

## Prévention des monolithes

Ces règles doivent être appliquées spontanément par Codex pendant tout
développement futur. La taille est un signal architectural, pas un objectif de
refactor : les responsabilités, la cohésion, les dépendances, la testabilité et
la fréquence de changement priment sur le nombre de lignes.

### Dette de structure et d'organisation

Chaque chantier doit éviter d'ajouter de la dette de structure ou
d'organisation. Avant de créer un fichier, un dossier, une abstraction ou une
nouvelle responsabilité, vérifier si l'emplacement, le nommage, les frontières
de module et les dépendances restent cohérents avec l'architecture existante.
Ne pas empiler les exceptions, les doublons, les fichiers fourre-tout ou les
répertoires plats pour livrer plus vite : corriger la cause localement lorsque
c'est sûr et proportionné, ou signaler explicitement le reliquat et préparer un
lot dédié. Toute modification doit laisser la zone concernée au moins aussi
simple à comprendre, maintenir et tester qu'avant.

Pendant tout chantier fonctionnel, évaluer aussi la dette structurelle des
fichiers et dossiers réellement traversés par le changement. Si une
modularisation ou une réorganisation directement liée est sûre, utile et
proportionnée, l'intégrer au même lot ; sinon, créer le lot structurel
immédiatement suivant sans élargir le chantier à l'ensemble du dépôt. Une zone
modifiée doit être laissée au moins aussi simple, cohérente et testable
qu'avant.

Favoriser des modules orientés responsabilités ou domaines, des routes et
pages minces, des dépendances localisées et des dossiers structurés plutôt que
de grands répertoires plats. La dette ne se mesure pas à la taille seule :
prendre aussi en compte la multiplicité des responsabilités, le couplage, la
duplication, la fréquence de changement, la difficulté de test et la quantité
de contexte nécessaire pour effectuer une modification locale. Un objectif
architectural explicite est de réduire le contexte que les agents doivent
relire, donc les coûts et tokens ainsi que le risque de modifications hors
périmètre, sans créer de micro-fichiers artificiels.

Repères de revue :

- Moins de 700 lignes : aucune action n'est imposée par la taille seule.
- De 700 à moins de 900 lignes : vigilance ; extraire uniquement si plusieurs
  responsabilités réellement séparables existent et si l'extraction clarifie
  une frontière de module.
- De 900 à 1200 lignes : effectuer une revue architecturale lors d'une
  modification significative, sans extraction obligatoire si le module reste
  cohérent.
- Au-delà de 1200 lignes : forte présomption de monolithe et recherche active
  de frontières ; ne pas extraire si cela augmente le couplage ou fragmente une
  orchestration cohérente.
- Ne jamais modulariser uniquement pour réduire le nombre de lignes.
- Éviter les micro-extractions de moins d'environ 100 lignes, sauf vraie
  frontière de contrat, réutilisation ou dépendance ; ce repère n'est pas une
  taille cible arbitraire pour les modules.
- Une façade déjà déclarée terminée n'est pas rouverte pour sa taille seule.
  La réévaluer si elle reçoit une nouvelle responsabilité, si sa cohésion se
  dégrade nettement, ou si elle croît d'environ 200 lignes ou 25 % depuis sa
  dernière revue. Une façade cohérente peut rester volumineuse ; si cette
  décision doit être tracée, utiliser le plan canonique
  `documentation/architecture/monolith-split-plan.md`.
- Pour le réseau, SQL, la concurrence, le lifecycle, le navigateur et
  l'orchestration, préférer une unité cohérente plus grande à une fragmentation
  artificielle.
- Les nouveaux modules extraits ne sont pas réévalués parce qu'ils approchent
  un seuil arbitraire ; les réévaluer s'ils accumulent plusieurs
  responsabilités, perdent leur cohésion ou deviennent difficiles à tester.

Règles de sûreté structurelle :

- Pour le réseau, SQLite, SQL, la concurrence, les transactions,
  l'orchestration, le navigateur, le lifecycle ou une décision métier,
  caractériser d'abord le comportement existant. Réaliser ensuite une
  extraction séparée si nécessaire ; ne pas refactorer opportunistement sans
  preuve.
- Ne jamais simplement déplacer un monolithe dans un nouveau gros helper : les
  modules doivent avoir des responsabilités cohérentes, une responsabilité
  unique autant que possible et un graphe de dépendances acyclique.
- Préserver les contrats publics, les imports historiques, les monkeypatches,
  l'ordre d'exécution, les exceptions et les side effects.
- Vérifier la taille après modification lorsqu'elle fait partie du contexte de
  revue, sans en faire une cible autonome.
- Un lot fonctionnel ne doit pas être bloqué ou gonflé par une modularisation
  non nécessaire. Si la frontière est sensible, signaler la dette et préparer
  le lot structurel séparé.

Le fichier `scripts/heavy-files-baseline.json` est un inventaire temporaire de
dette historique, pas une autorisation permanente de dépasser les seuils. Ne
pas y ajouter un nouveau fichier pour contourner le garde-fou, sauf exception
explicitement justifiée et mesurée dans le lot concerné. Lorsqu'un fichier
baseline est refactoré sous les seuils, retirer son entrée. Lorsqu'il est
significativement modifié, réévaluer sa cohésion et profiter du chantier pour
réduire sa dette si cela reste sûr et pertinent. Le garde-fou en mode
`--enforce` doit signaler les entrées baseline devenues obsolètes afin que ce
ratchet reste vérifiable.

---

## 4. Règles critiques de code

### Supabase et données

- Ne jamais exposer `service_role` côté client.
- Ne jamais désactiver RLS pour contourner un bug.
- Ne pas utiliser de SQL brut dans le code applicatif.
- Les changements SQL passent par une migration versionnée.
- Vérifier propriétaire/non-propriétaire, connecté/anonyme et rôle privilégié.
- Réduire les colonnes et lignes chargées avant d'optimiser ailleurs.
- Vérifier les erreurs de chaque opération Supabase.
- Régénérer ou réaligner les types si le schéma change.

Avant une requête coûteuse :

```txt
documentation/development/supabase-query-optimization-playbook.md
```

### Cycle de modification Supabase

1. identifier schéma, RLS, RPC, trigger, fonction, Storage, seed ou type concerné ;
2. inspecter les migrations actuelles ;
3. créer une migration versionnée ;
4. tester localement quand possible ;
5. vérifier la reconstruction ;
6. vérifier les types ;
7. vérifier les appels Next.js ou mobile ;
8. vérifier les permissions ;
9. ne jamais utiliser `service_role` comme contournement client ;
10. appliquer à distance seulement après validation appropriée.

### Authentification et profils

Modifier avec prudence :

```txt
apps/web/src/lib/domain-language.ts
apps/web/src/lib/profiles.ts
apps/web/src/lib/authz.ts
apps/web/src/lib/auth/
apps/web/src/proxy.ts
```

Préserver la distinction entre `Role`, `SessionRole` et `Parcours`.

Clerk reste le fournisseur d'identité principal du projet web.

### Permissions administratives

Un rôle privilégié ne doit pas modifier silencieusement le parcours utilisateur normal.

Exemple canonique :

- un admin qui rejoint normalement l'action d'un tiers suit la file normale ;
- une dérogation admin doit être explicite ;
- une dérogation sensible doit exiger une autorisation serveur, un motif et une trace d'audit.

Référence :

```txt
documentation/security/authz-authn-regles.md
```

### Client et serveur

- Garder les Client Components minces.
- Préférer Server Components, Server Actions ou services existants lorsque cohérent.
- Ne pas déplacer de logique sensible vers le client.
- Ne pas ajouter `"use client"` sans nécessité précise.

### Leaflet et SSR

Charger les composants Leaflet avec `next/dynamic` et `{ ssr: false }`.

Ne jamais accéder à `window`, `document`, `navigator` ou une API navigateur pendant le SSR.

### Texte public

Tout texte visible par l'utilisateur est en français, sauf surface explicitement localisée.

### Affichage des scores

Les scores restent calculés et stockés sur l'échelle interne `0–100`, mais tout
score présenté à l'utilisateur doit être formaté en pourcentage (`63 %`,
`63,5 %`) et jamais sous la forme `x/100`, `x / 100` ou `x sur 100`. Ne pas
multiplier ni diviser les valeurs pour ce changement de présentation. Utiliser
le helper commun `apps/web/src/lib/formatters/score.ts` et maintenir le garde
anti-régression associé. La règle complète et ses exceptions pour les formules
techniques sont documentées dans
`documentation/development/ui-score-formatting.md`.

### Homepage, header et footer

Ne pas modifier sans demande explicite :

```txt
apps/web/src/app/page.tsx
apps/web/src/components/accueil/
```

Ne pas modifier le header global ni le footer global sans demande explicite.

---

## 5. Design system

Avant toute modification UI :

1. lire `documentation/design-system/README.md` ;
2. lire `documentation/design-system/BLOC_COLOR_SYSTEM_PREMIUM.md` ;
3. consulter `documentation/pages_site/INDEX.md` ;
4. consulter la fiche canonique de la page.

Utiliser les composants canoniques existants, notamment lorsque pertinents : `CmmCard`, `CmmButton`, `PageHeader`.

### Couleurs

Le fichier de référence est :

```txt
documentation/design-system/BLOC_COLOR_SYSTEM_PREMIUM.md
```

Règles :

- ne pas inventer une combinaison de teintes ;
- respecter la famille de page ;
- le bloc `Accueil & Pilotage` constitue une exception documentée avec combinaison orange + brun ;
- `Cartographie & Impact` sélectionne la teinte selon la page : `sky` pour cartographie, `red/rose` pour impact ;
- les familles autonomes utilisent leur propre palette documentée.

### Titres

Éviter les retours à la ligne décoratifs.

Ordre d'ajustement :

1. taille ;
2. tracking ;
3. largeur utile ;
4. réorganisation mobile.

### États

Toute surface modifiée gère lorsque pertinent :

- chargement ;
- vide ;
- erreur ;
- accès refusé ;
- succès ;
- mobile ;
- accessibilité clavier et lecteur d'écran.

---

## 6. Documentation et pages

### Gouvernance documentaire

`documentation/pages_site/` est la source de vérité fonctionnelle du point de vue utilisateur pour :

- rôle de la page ;
- contenu ;
- parcours ;
- comportement ;
- UX/UI ;
- états ;
- captures ;
- améliorations propres à la page.

### README de dossier

Lorsqu'un dossier porte une responsabilité identifiable, une convention
particulière, un point d'entrée, une procédure de validation ou une frontière
d'architecture, ajouter ou mettre à jour son `README.md` dès que c'est
pertinent. Le README doit expliquer le rôle du dossier, les fichiers ou sous-
dossiers importants, les règles d'organisation et les commandes utiles, sans
dupliquer une documentation canonique déjà présente. Après toute
réorganisation significative, vérifier que les README concernés restent
exacts ; créer un README uniquement lorsqu'il apporte une orientation durable,
pas pour réduire artificiellement la taille d'un autre document.

Les sujets techniques transversaux restent dans les dossiers techniques adaptés.

Pour un sujet mixte :

- résumé fonctionnel dans la fiche de page ;
- détail technique dans le dossier technique ;
- lien entre les deux ;
- aucune duplication.

- Tous les 2 à 3 prompts consacrés à un même chantier, réévaluer la
  documentation canonique et la mettre à jour dès qu’elle ne reflète plus
  le comportement, les décisions, les validations ou les limites réelles.
  Ne pas créer de modification documentaire artificielle lorsqu’aucune
  information n’a changé.

### Quarto

Ne pas numéroter manuellement les titres destinés à Quarto.

Écrire :

```md
# Titre
## Sous-titre
### Section
```

Ne pas écrire :

```md
# 1. Titre
## 2. Sous-titre
```

### Sources

Ne jamais inventer une source, une mesure, un chiffre ou une référence.

---

## 7. Charge machine

Ne pas lancer plusieurs commandes lourdes en parallèle.

Exemples :

```txt
npm run checks
npm run build
npm run test
pytest
rg -n sur tout le dépôt
scans documentaires larges
```

Préférer une validation ciblée lorsqu'elle suffit.

Les scans statiques et contrôles read-only indépendants peuvent être
parallélisés avec un throttle borné. Les commandes lourdes — suite Vitest,
tests Node significatifs, pytest, build/Turbopack et E2E — restent isolées et
s'exécutent séquentiellement. Dans une même validation, dédupliquer les
fichiers de test et ne pas relancer séparément un groupe déjà couvert par la
suite complète ; la validation `changed` doit dériver le build du périmètre
runtime/config réellement modifié et l'omettre pour la documentation seule ou
les tests sans effet sur le bundle.

Ne pas laisser tourner inutilement :

- `npm run dev` ;
- Vitest watch ;
- watchers de build ;
- processus localhost inutilisés.

Éviter d'explorer par défaut :

```txt
node_modules/
.next/
.vercel/
.playwright-mcp/
.codex-remote-attachments/
artifacts/
backups/
```

---

## 8. Tests et validation

Ne jamais annoncer qu'une commande a réussi si elle n'a pas été exécutée.

### Validation ciblée

```bash
npm run checks:changed
```

### Validation complète

```bash
npm run checks
```

La validation complète doit couvrir les garde-fous de gouvernance, les tests, le typecheck, le lint et le build web. Les tests E2E restent explicites tant qu'ils nécessitent une installation navigateur dédiée.

En présence d'un worktree parallèle, cette couverture est évaluée selon les
règles d'attribution ci-dessus : un contrôle arrêté par une erreur étrangère au
lot est reporté dans `SKIPPED_PARALLEL_CHANTIER` et ne dégrade pas le verdict
du changement courant.

### Ordre recommandé

1. test ciblé ;
2. typecheck ;
3. lint ;
4. tests fonctionnels ;
5. tests sécurité/régression ;
6. build ;
7. E2E si le périmètre le justifie.

### En cas d'échec

1. lire l'erreur complète ;
2. identifier la cause racine ;
3. regrouper les erreurs de même cause ;
4. corriger un lot cohérent ;
5. relancer la vérification ciblée ;
6. ne lancer le build complet qu'après stabilisation.

Ne jamais créer manuellement de fichiers internes `.next`.

---

## 9. Vérification UI et navigateur

Ne pas lancer de navigation automatisée, capture ou audit visuel sans demande explicite de l'utilisateur.

Les tests E2E non visuels peuvent être exécutés lorsqu'ils font explicitement partie du périmètre de validation demandé.

---

## 10. Réponse finale

La réponse finale doit indiquer :

- modifications réalisées ;
- fichiers principaux ;
- validations exécutées ;
- erreurs rencontrées ;
- validations restantes.
- Lorsqu'une exécution de prompt a traversé un fichier monolithique, un dossier
  mal structuré, une duplication importante, un couplage excessif ou une dette
  architecturale notable, le signaler explicitement dans le compte rendu, même
  si la dette n'a pas été corrigée dans le lot. En une phrase, indiquer le
  fichier ou dossier concerné, la nature de la dette, si elle a été corrigée et,
  sinon, si elle mérite un lot suivant. Limiter ce signalement au périmètre
  réellement traversé : ne pas en faire un audit global du dépôt ni bloquer une
  livraison fonctionnelle valide.

Ne pas donner de long raisonnement interne.

---

## 11. Interdictions synthétiques

Il est interdit de :

- créer un dépôt parallèle ou worktree sans autorisation ;
- créer des fichiers racine non justifiés ;
- modifier la homepage, le header ou le footer sans demande ;
- utiliser `service_role` côté client ;
- désactiver RLS pour débloquer un flux ;
- utiliser du SQL brut dans le code applicatif ;
- accéder aux APIs navigateur pendant le SSR ;
- charger Leaflet côté SSR ;
- inventer des sources ou chiffres ;
- laisser des placeholders ou routes cassées après une modification ;
- prétendre avoir testé sans validation réelle ;
- considérer une ancienne conversation comme source de vérité supérieure au dépôt actuel.

---

## 12. Gestion du contexte des conversations

Avant d'exécuter une tâche complexe, évaluer si le contexte actuel de la conversation reste suffisamment fiable.

Si l'une des situations suivantes apparaît :

- la conversation mélange plusieurs chantiers différents ;
- des décisions architecturales importantes risquent d'être perdues ;
- le contexte devient trop volumineux pour raisonner correctement ;
- la tâche nécessite une compréhension globale qui dépasse le contexte utile ;
- des signes d'oubli ou de perte de précision apparaissent ;

ne pas commencer immédiatement l'implémentation.

À la place :

1. indiquer brièvement pourquoi une nouvelle conversation améliorerait la fiabilité ;
2. fournir une passation courte contenant :
   - l'état actuel du chantier ;
   - le dernier commit Git ;
   - les fichiers modifiés ;
   - les décisions importantes à conserver ;
   - la prochaine étape exacte ;
3. attendre confirmation avant de continuer.

Privilégier une nouvelle conversation plutôt qu'une reconstruction approximative d'un contexte perdu.
