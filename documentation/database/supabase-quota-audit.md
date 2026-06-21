# Audit des quotas Supabase de CleanMyMap

Ce document sert de vue d'ensemble sur les causes probables de consommation des quotas Supabase dans le dépôt.

Il ne remplace pas les dashboards Supabase, mais il permet de repérer les régressions avant qu'elles ne deviennent visibles en prod.

## Méthode

- inventaire statique du code `apps/web/src` et `apps/web/scripts`
- classification des accès Supabase par table, bucket, RPC et Realtime
- repérage des `SELECT *`, requêtes non bornées, écritures répétées et accès déclenchés au montage
- croisement avec les usages opérationnels déjà présents dans le dépôt

## Quotas Supabase à surveiller

Les quotas exacts dépendent du plan et de l'organisation, mais les dimensions qui comptent pour CleanMyMap sont les suivantes.

| Surface | Quota / signal | Où le projet consomme |
|---|---|---|
| Database / PostgREST | volume de requêtes, taille des réponses, egress | listes `actions`, `profiles`, `community_events`, `event_rsvps`, `app_notifications`, `points_ledger`, `user_points` |
| Storage | stockage total, taille des objets, egress fichier | `chat-attachments`, `reports`, `prints`, `impact`, `exports` |
| Auth | MAU, rate limits d'auth, appels `getUser` | aujourd'hui surtout Clerk côté app, Supabase Auth reste peu utilisé |
| Realtime | connexions concurrentes, messages | abonnement chat sur `app_messages` |
| Edge Functions | invocations | aucune invocation Supabase directe détectée dans le code applicatif courant |

### Références de plan vérifiées le 2026-06-05

- Free: `500 MB` database, `1 GB` storage, `5 GB` egress, `200` connexions Realtime, `2 M` messages Realtime, `500 000` invocations Edge Functions, `50 MB` max upload
- Pro / Team: `100 GB` storage, `250 GB` egress, `500` connexions Realtime, `5 M` messages Realtime, `2 M` invocations Edge Functions
- Auth: `50 000` MAU inclus sur le Free, avec des limites spécifiques sur les endpoints d'auth

Ces chiffres sont des références publiques. Si le projet est sur un plan custom, la limite effective doit être relue dans le dashboard.

## Tables les plus sollicitées

Les tables ci-dessous ressortent comme les plus exposées dans le code.

| Table | Lecture | Écriture | Risque |
|---|---:|---:|---|
| `actions` | très élevé | élevé | page carte, création, import, modération, analytics, backfills |
| `profiles` | élevé | moyen | authz, rôles, referrals, notifications de proximité |
| `progression_events` | élevé | élevé | gamification, badges, backfill, audit |
| `community_events` | élevé | moyen | feed communautaire, notifications et RSVP |
| `event_rsvps` | élevé | moyen | feed communautaire, analytics, backfill |
| `app_notifications` | élevé | moyen | notifications UI, inserts système |
| `points_ledger` | élevé | moyen | analytics points, backfill gamification |
| `user_points` | moyen | faible | funnel, points, badges |
| `quiz_srs` | moyen | faible | SRS côté client |
| `funnel_events` | moyen | moyen | analytics et backfills |
| `supabase_storage_usage_snapshots` | moyen | faible | tableau de bord stockage |
| `service_email_events` | moyen | faible | capture impact / email service |

## Requêtes les plus coûteuses

### Charges en lecture massive

- `apps/web/src/lib/environmental-impact-estimator/project-signals.ts:1171-1281`
  - 11 lectures en parallèle
  - plafonnées à `6000` lignes chacune via `PROJECT_SIGNAL_ROW_LIMIT`
  - c'est le plus gros consommateur de requêtes de lecture dans le dépôt
- `apps/web/src/lib/supabase/storage-usage-service.ts:58-120`
  - scan complet de `storage.objects` par pagination
  - déclenche aussi un `upsert` mensuel dans `supabase_storage_usage_snapshots`
- `apps/web/src/lib/gamification/progression-backfill.ts:163-166`
  - lecture de plusieurs tables pour recalculer la progression
- `apps/web/src/app/api/community/events/route.ts:126-320`
  - lecture des événements, des RSVP, puis des profils de notification

### Charges Storage / egress

- `apps/web/src/components/chat/hooks/use-chat-submit.ts:129-147`
  - upload de pièces jointes dans `chat-attachments`
  - récupération de l'URL publique après upload
- `apps/web/scripts/export-supabase-archive.mjs:65-110`
  - export complet des tables et téléchargement de buckets
- `apps/web/scripts/cleanup-supabase-retention.mjs:93-184`
  - listing et suppression de vieux objets

### Charges Realtime

- `apps/web/src/components/chat/hooks/use-chat-data.ts:151-173`
  - abonnement `postgres_changes` sur `app_messages`
  - polling de secours toutes les 60 secondes

### Chat et salons

Les salons de discussion sont probablement la fonctionnalité la plus dangereuse pour rester sur un plan gratuit.

- beaucoup d'écritures,
- beaucoup de lectures,
- du temps réel,
- de la modération,
- du spam,
- des notifications,
- des signalements.

Pour une première version, privilégier un lien vers Discord, WhatsApp, Signal, Mattermost, Matrix ou un formulaire de contact plutôt que de construire un vrai chat dans Supabase.

Si un chat Supabase est maintenu, il doit être traité comme un hotspot prioritaire de quota et documenté avec bornes, rétention et stratégie anti-spam.

### Charges Auth

- CleanMyMap utilise surtout Clerk.
- Le risque Supabase Auth reste faible tant qu'aucun nouveau flux `supabase.auth.*` n'est ajouté.
- Les appels `getUser()` et les parcours Clerk restent à ne pas confondre avec Supabase Auth.

## Rapport automatique de risque par table

Le dépôt inclut un script d'audit automatique qui produit un rapport par table et par ressource.

- script: `apps/web/scripts/supabase-quota-audit.mjs`
- sortie: `artifacts/supabase/quota-audit/`
- artefacts produits:
  - `repo-audit.json`
  - `repo-audit.md`
  - `table-risk-report.json`
  - `table-risk-report.md`
  - snapshots optionnels des advisors Supabase si `POSTGRES_URL_NON_POOLING` est disponible

### Snapshot courant

Le dernier snapshot généré le 2026-06-05 confirme:

- `supabase db advisors --type performance` -> `No issues found`
- `supabase db advisors --type security` -> `No issues found`
- `supabase db lint --schema public` -> `No schema errors found`

Les résultats bruts sont archivés dans `artifacts/supabase/quota-audit/`.

## Garde-fous à conserver

- ne pas chercher à faire disparaître tous les `high` si la table est centrale et que l'usage est légitime,
- traiter d'abord les `SELECT *`,
- traiter d'abord les requêtes sans `limit`,
- traiter d'abord les requêtes sans filtre ou trop larges,
- traiter d'abord les accès répétés au montage,
- traiter d'abord les colonnes sur-sélectionnées,
- traiter d'abord les tables très sollicitées mais encore mal bornées,
- pas de `SELECT *` sur les routes UI quand les colonnes utiles sont connues
- pas de lecture non paginée sur les listes métier
- pas de requête déclenchée à chaque montage si un cache ou un polling plus lent suffit
- pas de `storage.list()` ou `storage.download()` sur tout un bucket hors script de maintenance
- pas de `rpc()` ajouté sans mesurer l'effet sur la charge
- pas de nouvelles subscriptions Realtime sans besoin produit clair
- pas de salon de discussion Supabase sans justification forte, bornes, rétention et stratégie anti-spam explicites

## Priorités d'audit

Pour CleanMyMap, l'audit Supabase doit privilégier la réduction du volume sans casser les usages:

- acceptable si la table est centrale mais les requêtes restent filtrées, bornées et lisibles;
- acceptable si le volume d'écriture est élevé mais utile métier;
- à corriger dès qu'une requête critique est non bornée, trop large, ou charge une table entière pour un simple besoin d'affichage;
- à éviter si le refactor complexifie sans gain net de risque;
- à éviter pour les index ajoutés "au cas où";
- `high` acceptable si l'usage est expliqué et borné;
- `critical` ou `high` non borné, non filtré, ou filtré côté React après chargement complet, à corriger;
- pas de refactor compliqué sans baisse claire du risque;
- conserver un `high` sur `profiles` ou une autre table centrale si l'usage est structurellement légitime;
- corriger en priorité les requêtes non bornées, trop larges, trop fréquentes ou non justifiées;
- accepter les coûts élevés quand ils correspondent à un usage central, filtré, minimal en colonnes et borné.

### Cartographie à risque

La cartographie doit être traitée comme une zone à risque:

- une carte ne doit jamais charger toute la table `spots`, `actions`, `trash_spotter_spots` ou `community_events`;
- elle doit charger seulement la zone visible;
- elle doit appliquer une limite et des filtres;
- elle peut utiliser des clusters ou des couches simplifiées si cela réduit le volume sans casser l'usage.

## Tri des prochains audits

Les prochaines passes de tri doivent cibler uniquement:

- `profiles` en premier, en cherchant les 4 requêtes non bornées et tout chargement large inutile;
- `event_rsvps` et `action_participants` ensuite, avec focus sur les listes, compteurs et historiques;
- `spots`, `trash_spotter_spots` et `community_events` pour garantir des chargements carte toujours bornés;
- `actions` en contrôle final, pas en priorité si les autres postes restent plus risqués;
- les lectures non filtrées;
- les lectures sans `limit`;
- les sur-sélections de colonnes;
- les accès répétés inutiles;
- les usages critiques sur `profiles`, `participants`, `map`, `actions` et `notifications`.

## Doctrine produit à appliquer avant chaque nouvelle feature

Avant d'ouvrir une nouvelle table ou d'ajouter un nouveau flux Supabase, lire aussi le guide développeur:

- [Guide développeur Supabase](../development/supabase-quota-guide.md)

Les décisions attendues sont les suivantes:

- contenus pédagogiques, guides et ressources dans Git;
- quiz anonymes dans `localStorage` par défaut;
- formulaires bénévoles en écriture unique;
- estimateurs graphiques basés sur des agrégats;
- PDFs et exports générés à la demande;
- tables centrales acceptées en `high` si les requêtes restent bornées et justifiées.

Si la proposition n'explique pas clairement où vivent les données, combien elle lit, combien elle écrit et comment elle est bornée, elle est incomplète.

Règle d'exécution à appliquer pour chaque nouvelle fonctionnalité:

- où les données sont stockées;
- combien on écrit;
- combien on lit;
- comment c'est borné;
- pourquoi Supabase est justifié, ou pourquoi il ne l'est pas.

## Pour relancer l'audit

```bash
npm -C apps/web run backend:supabase:quota-audit
```

Pour inclure aussi les snapshots des advisors sur la base distante:

```bash
npm -C apps/web run backend:supabase:quota-audit -- --with-db
```
