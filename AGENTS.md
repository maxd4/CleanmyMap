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
- Écriture uniquement si l'utilisateur l'autorise explicitement dans la conversation.
- Dans ce cas, créer une branche dédiée.
- Committer les modifications.
- Ouvrir une Pull Request vers `main`.
- Ne jamais pousser directement sur `main`.
- Ne jamais fusionner une PR.
- Sans autorisation explicite, rester en lecture seule.

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

Il ne doit jamais écrire sans autorisation explicite de l'utilisateur. Quand l'écriture est autorisée, il doit passer par une branche dédiée, commit et PR vers `main`, sans push direct sur `main` et sans fusionner la PR.

### Intégrateur local

L’intégrateur local, notamment Codex, intervient principalement pour :

- vérifier la cohérence avec le checkout local complet ;
- intégrer les fichiers fournis ;
- exécuter les validations ;
- propager les changements transversaux nécessaires ;
- signaler les conflits avec le code réel.

Sans autorisation explicite, l’intégrateur reste en lecture seule.

Quand l'utilisateur autorise une écriture, le flux attendu est :

- créer une branche dédiée ;
- committer les changements ;
- ouvrir une Pull Request vers `main` ;
- ne jamais pousser directement sur `main` ;
- ne jamais fusionner la PR.

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

### Dossiers protégés

Ne pas modifier, déplacer, supprimer, renommer ou dupliquer sans demande explicite :

```txt
documentation/pepite/
documentation/gpt-context/
```

---

## 3. Stack réelle et structure

La version exacte des dépendances est définie par les manifestes, en particulier `apps/web/package.json`.

Repères actuels :

- Next.js 16 avec App Router ;
- React 19 ;
- TypeScript 6 ;
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

Le dossier racine `supabase/migrations/` est un miroir historique tant que l'ADR de migration n'est pas définitivement appliqué. Ne jamais modifier un seul arbre de migrations sans vérifier l'autre.

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

Les sujets techniques transversaux restent dans les dossiers techniques adaptés.

Pour un sujet mixte :

- résumé fonctionnel dans la fiche de page ;
- détail technique dans le dossier technique ;
- lien entre les deux ;
- aucune duplication.

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
