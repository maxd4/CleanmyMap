# AGENTS.md — CleanMyMap

## Portée du fichier

Ce fichier définit les règles de travail obligatoires pour tout agent IA intervenant sur le dépôt CleanMyMap.

Les règles ci-dessous s’appliquent à l’ensemble du dépôt, sauf instruction plus spécifique donnée par l’utilisateur dans la conversation courante.

## Canari de session

Commencer chaque réponse par :

`Maxence —`

Cette règle doit être respectée pour toutes les réponses. Elle sert de canari de session : si cette mention manque, la conversation doit être considérée comme dérivant et un nouveau flux peut être ouvert.

## Priorités de travail

Ordre de priorité :

1. Respect des consignes explicites de l’utilisateur.
2. Sécurité, données et authentification.
3. Cohérence avec l’architecture existante.
4. Respect du design system CleanMyMap.
5. Tests et validation.
6. Simplicité des modifications.
7. Performance lorsque le sujet est pertinent.

Ne jamais privilégier une refonte large si une correction ciblée suffit.

---

## 1. Règles strictes de travail local

### Interdiction de créer des dossiers projet parallèles

Il est strictement interdit de créer un nouveau dossier sibling, une copie du dépôt, un worktree Git ou tout autre dossier projet parallèle à côté de `CleanmyMap-main` sans autorisation explicite de l’utilisateur.

Cette interdiction s’applique à tous les agents, modèles et automatisations travaillant sur ce projet.

Ne pas créer de dossier du type :

* `CleanmyMap-*`
* `CleanmyMap-main-*`
* `.worktrees/*`
* `worktrees/*`
* toute copie locale du dépôt hors du dossier courant

Tout travail doit rester dans :

```txt
C:\Users\sophi\Desktop\MAXENCE\business\CleanmyMap-main
```

Si une isolation Git est nécessaire, demander d’abord l’accord explicite de l’utilisateur et préciser :

* le nom du dossier qui serait créé ;
* la raison exacte ;
* la durée de conservation ;
* la procédure de fusion ;
* la procédure de suppression.

Sans cet accord, utiliser uniquement la branche courante et les fichiers du dossier `CleanmyMap-main`.

### Hygiène de la racine

Ne pas générer de nouveaux fichiers à la racine du dépôt sauf demande explicite de l’utilisateur.

Les fichiers temporaires, captures, logs, exports et artefacts de debug doivent aller dans un dossier adapté, par exemple :

* `artifacts/`
* `documentation/`
* `backups/`
* un sous-dossier dédié déjà prévu par le dépôt

Si un fichier doit absolument vivre à la racine, il doit être un fichier d’architecture, de configuration ou un livrable racine clairement justifié.

Tout fichier racine ajouté sans demande explicite doit être considéré comme une régression de gouvernance et doit être nettoyé avant validation.

Ne pas créer de fichiers ou dossiers miroir pour contourner une règle d’emplacement. Ne pas dupliquer un même contenu dans deux emplacements parallèles.

---

## 2. Stack et structure du projet

### Stack principale

* Framework : `Next.js 15` avec App Router.
* Styling : `Tailwind CSS 4`.
* Authentification : `Clerk` via `@clerk/nextjs`.
* Base de données et backend : `Supabase` avec PostgreSQL.
* Cartographie : `react-leaflet`.
* Icônes : `lucide-react`.

Avant toute modification importante, vérifier les versions réelles dans `package.json`, les fichiers de configuration et la documentation du dépôt.

### Structure importante

* `apps/web/src/app` contient les routes applicatives.
* `apps/web/src/components/ui` contient les composants UI réutilisables.
* `apps/web/src/components/sections/rubriques` contient les modules fonctionnels principaux.
* `apps/web/src/components/accueil` contient les composants liés à la homepage.
* `apps/web/src/lib/sections-registry/config.ts` centralise l’enregistrement des modules de rubriques, et `apps/web/src/lib/sections-registry/index.ts` ré-exporte le registre.
* `apps/web/src/lib/domain-language.ts` est la source de vérité pour les notions `Role`, `SessionRole` et `Parcours`.
* `scripts/` et `maintenance/python/` contiennent les scripts d’ingestion, de maintenance et d’historique technique.

Quand un nouveau module est ajouté dans `apps/web/src/components/sections/rubriques`, il doit être enregistré dans `apps/web/src/lib/sections-registry/config.ts`.

---

## 3. Règles critiques de code

### Supabase et données

* Ne jamais utiliser de SQL brut dans le code applicatif.
* Utiliser les clients Supabase existants et les helpers du projet.
* Ne jamais désactiver une protection de sécurité pour faire passer une fonctionnalité.
* Ne jamais exposer de secret côté client.
* Vérifier les règles d’accès, les validations et les erreurs pour tout flux manipulant des données utilisateur.

### Authentification et profils

Ne pas modifier les fichiers suivants sans extrême prudence :

* `apps/web/src/lib/domain-language.ts`
* `apps/web/src/lib/profiles.ts`

Ces fichiers structurent des notions centrales du domaine CleanMyMap. Toute modification doit préserver le sens sémantique des rôles, parcours, profils et droits associés.

### Client Components et Server Components

* Garder les Client Components (`"use client"`) aussi minces que possible.
* Préférer les Server Components, Server Actions ou hooks de données existants lorsque c’est cohérent avec l’architecture.
* Ne pas déplacer inutilement de logique serveur vers le client.
* Ne pas ajouter `"use client"` à un composant sans raison précise.

### Leaflet et rendu côté serveur

`react-leaflet` doit toujours être chargé dynamiquement avec `next/dynamic` et `{ ssr: false }`.

Ne jamais accéder à `window`, `document`, `navigator` ou à une API navigateur pendant le SSR.

Toute logique cartographique doit être compatible avec le rendu Next.js côté serveur.

### Texte public

Tout texte visible par les utilisateurs doit être écrit en français, notamment :

* `label`
* `title`
* `description`
* boutons
* états vides
* messages d’erreur
* aides contextuelles

Exception : un objet multilingue explicite du type `{ fr: "...", en: "..." }`.

### Homepage

Ne jamais modifier la homepage sans demande explicite de l’utilisateur.

Cela concerne notamment :

* `apps/web/src/app/page.tsx`
* les composants associés dans `apps/web/src/components/accueil/`

---

## 4. Design system et règles UI

### Règle générale

Respecter le design system CleanMyMap existant, ses tokens CSS, ses composants, ses conventions visuelles et ses patterns de page.

Ne pas introduire un style isolé si un composant ou une convention existe déjà dans le projet.

### Lisibilité des héros et titres de page

Sur les héros et titres de page, éviter les retours à la ligne décoratifs.

Priorité d’ajustement :

1. réduire la taille du texte ;
2. réduire le tracking ;
3. ajuster la largeur utile ;
4. réorganiser le bloc sur mobile.

Un titre ou sous-titre doit tenir sur une seule ligne sur desktop standard lorsque c’est possible sans nuire à la lisibilité.

### Header et footer

Ne pas modifier le header global ni le footer global sans demande explicite de l’utilisateur.

Lorsqu’une page doit être améliorée visuellement, travailler uniquement sur le contenu éditable de la page, sauf consigne contraire.

### États système

Toute page ou fonctionnalité nouvelle ou modifiée doit gérer, si pertinent :

* état de chargement ;
* état vide ;
* erreur utilisateur ;
* accès refusé ;
* succès ou confirmation ;
* cas mobile.

Les états doivent être cohérents avec la palette et les conventions du projet.

### Gamification et transparence

Informer systématiquement l’utilisateur lorsqu’une action réalisée sur le site lui apporte :

* de l’XP ;
* un badge ;
* une progression visible ;
* une récompense de gamification.

Cette information doit être claire, mais ne doit pas rendre l’interface artificielle ou confuse.

---

## 5. Système de couleurs CleanMyMap

### Structure globale

La homepage est structurée en 5 blocs avec une logique multi-teintes selon le type de page :

1. Accueil & Pilotage
2. Agir
3. Cartographie & Impact
4. Réseau & Discussions
5. Apprendre

### Mapping des teintes

| Bloc ou rubrique     | Teinte dominante   |
| -------------------- | ------------------ |
| Accueil              | `amber` / `orange` |
| Pilotage             | `amber` / `brun`   |
| Agir                 | `emerald`          |
| Cartographie         | `sky`              |
| Impact               | `red` / `rose`     |
| Réseau & Discussions | `indigo`           |
| Apprendre            | `yellow`           |

### Mapping des routes

| Routes                                            | Teinte dominante   |
| ------------------------------------------------- | ------------------ |
| `/dashboard`, `/profil`, `/explorer`, `/feedback` | `amber` / `orange` |
| `/pilotage`, `/admin`, `/elus`, `/godmode`        | `amber` / `brun`   |
| `/actions/map`, `/sandbox`                        | `sky`              |
| `/reports`, `/gamification`                       | `red` / `rose`     |

### Règle stricte

Une page = une teinte dominante.

Ne pas mélanger deux familles dominantes sur une même page, par exemple :

* ne pas mélanger `orange` et `brun` sur une même page ;
* ne pas mélanger `sky` et `red` / `rose` sur une même page.

Référence complète :

```txt
documentation/design-system/BLOC_COLOR_SYSTEM_PREMIUM.md
```

---

## 6. Markdown, documentation et Quarto

Ne jamais mettre de numéros de section ou de titre en dur dans les fichiers Markdown destinés à l’export Quarto.

Ne pas écrire :

```md
# 1. Titre
## 2. Sous-titre
### 3.1 Section
```

Écrire uniquement :

```md
# Titre
## Sous-titre
### Section
```

Les numéros sont générés automatiquement par Quarto lors de l’export.

Pour les fichiers Markdown destinés au rapport CleanMyMap :

* conserver une structure propre ;
* éviter les tableaux trop larges ;
* privilégier les sources en fin de section si elles sont nécessaires ;
* ne pas inventer de sources ;
* ne pas insérer de numérotation manuelle ;
* éviter les commentaires provisoires sauf demande explicite.

---

## 7. Charge machine et commandes

Éviter de lancer plusieurs commandes lourdes en parallèle, notamment :

* `npm run checks`
* `pytest`
* `typecheck`
* `rg -n` sur tout le dépôt
* scans de documentation
* watchers de build
* scripts de maintenance Python lourds

Avant de lancer une commande lourde, vérifier qu’une autre tâche active sur le dépôt ne produit pas déjà la même charge.

Si une vérification ciblée suffit, préférer cette vérification à un scan global.

Ne pas laisser tourner inutilement :

* `npm run dev`
* tests `vitest` en mode watch ;
* watchers de build ;
* scripts de maintenance ;
* processus liés à un `localhost` inutilisé.

Les commandes `git` peuvent rester en arrière-plan lorsqu’elles sont légères.

---

## 8. Tests et validation

Après une modification significative, lancer les vérifications pertinentes disponibles dans le dépôt.

Avant de lancer une commande, vérifier dans `package.json`, `turbo.json`, la documentation ou les scripts du projet quelle commande est adaptée.

Priorité :

1. vérification ciblée sur les fichiers modifiés ;
2. typecheck si la modification touche TypeScript ;
3. lint si la modification touche du code applicatif ;
4. tests si une logique fonctionnelle a été modifiée ;
5. build si la modification touche l’architecture, les routes ou la configuration.

Ne jamais prétendre qu’un test a été exécuté s’il ne l’a pas été.

Si une commande échoue :

1. lire l’erreur ;
2. identifier la cause racine ;
3. corriger de manière ciblée ;
4. relancer la commande pertinente.

Si les tests ne peuvent pas être lancés, expliquer précisément pourquoi dans la réponse finale.

---

## 9. Vérification UI et navigateur

Ne pas lancer de vérification web du rendu du site, d’inspection navigateur, de capture Playwright ou d’audit visuel sans demande explicite de l’utilisateur.

Si l’utilisateur demande seulement une modification UI, appliquer les conventions du dépôt dans le code, puis signaler en fin de réponse qu’une vérification visuelle reste recommandée.

---

## 10. Réponse finale attendue

La réponse finale de l’agent doit être concise et factuelle.

Elle doit indiquer :

* les modifications réalisées ;
* les fichiers principaux modifiés ;
* les vérifications lancées ;
* les erreurs rencontrées, s’il y en a ;
* les vérifications restantes, si certaines n’ont pas pu être faites.

Ne pas donner de long raisonnement interne.
Ne pas masquer une erreur.
Ne pas annoncer une réussite si la validation n’a pas été faite.

---

## 11. Interdictions synthétiques

Il est interdit de :

* créer un dossier projet parallèle sans autorisation explicite ;
* créer un worktree sans autorisation explicite ;
* ajouter des fichiers racine non demandés ;
* modifier la homepage sans demande explicite ;
* modifier le header ou footer global sans demande explicite ;
* utiliser du SQL brut dans le code applicatif ;
* accéder à `window` pendant le SSR ;
* charger `react-leaflet` sans `next/dynamic` et `{ ssr: false }` ;
* durcir une numérotation Markdown destinée à Quarto ;
* laisser des placeholders, TODO ou routes cassées après une modification ;
* prétendre avoir testé sans avoir réellement lancé les vérifications ;
* lancer une inspection navigateur ou Playwright sans demande explicite.
