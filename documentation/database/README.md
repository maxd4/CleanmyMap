# Database - Guide de Référence

Entrée principale pour tout ce qui touche aux requêtes, index, RLS, stockage et quotas Supabase.

## Ordre de lecture

1. [Supabase quota audit](./supabase-quota-audit.md)
2. [Guide développeur Supabase](../development/supabase-quota-guide.md)
3. [Supabase refresh strategy audit](../development/supabase-refresh-strategy-audit.md)
4. [Supabase table optimization playbook](./supabase-table-optimization-playbook.md)
5. [Supabase query optimization playbook](../development/supabase-query-optimization-playbook.md)
6. [Database query & index audit](./QUERY_INDEX_AUDIT.md)
7. [Supabase linked advisories report](../security/supabase-linked-advisories-2026-05-20.md)

## Ce que couvre ce dossier

- les quotas Supabase utilisés par CleanMyMap
- la doctrine de stockage produit pour les nouvelles features
- les tables les plus sollicitées
- les requêtes les plus coûteuses
- les risques Storage, Auth, Realtime et Edge Functions
- les garde-fous pour éviter les régressions
- les migrations de compatibilité, notamment la lecture des anciens champs de territoire et l'écriture des nouveaux champs nationaux

## Tables centrales à garder en tête

Ces tables peuvent rester très sollicitées sans être des problèmes en soi. Le bon réflexe est de borner les lectures, pas de les cacher.

| Table | Usage principal | Garde-fou à retenir |
| --- | --- | --- |
| `profiles` | identité, rôles, préférences, signaux de notification | lecture par identifiant ou recherche exacte, jamais de scan large |
| `actions` | carte, création, import, modération, analytics | filtrer par période, statut, zone ou type avant toute lecture large |
| `progression_profiles` | progression persistante par utilisateur | lecture ciblée par utilisateur ou RPC dédié |
| `progression_events` | journal de progression et d'audit | ne pas l'utiliser comme source de recalcul global au `GET` |
| `user_points` | solde courant de points | lire un agrégat ou un résumé, pas l'historique complet |
| `points_ledger` | historique des points | historique paginé ou agrégat persistant uniquement |
| `community_events` | événements communautaires | toujours borner par date, statut ou géographie |
| `event_rsvps` | réponses RSVP | lecture par événement ou par utilisateur, jamais en balayage complet |
| `app_notifications` | notifications utilisateur | lecture par utilisateur courant avec `limit` et tri |
| `quiz_type_progress` | progression de quiz par type | lecture ciblée par utilisateur et type, jamais une vue globale brute |
| `quiz_srs` | répétition espacée des quiz | lecture par utilisateur et liste de questions limitée |
| `checklist_progress` | état des checklists | lecture par couple `user_id` / `checklist_id` |
| `runbook_checks` | état des runbooks | lecture par profil, pas de listing large |
| `user_badge_totals` | agrégats de badges | lecture par utilisateur, pas pour recalculer un classement complet |

Règle commune:

- une table centrale peut rester dans les audits si son usage est structurellement légitime;
- elle ne doit jamais servir d'excuse pour une lecture non bornée ou un `select("*")` par défaut;
- si plusieurs écrans réutilisent le même scan, la réponse doit passer par une vue, un RPC ou un agrégat persistant.
- si une table sert déjà d'agrégat persistant, ne pas la transformer en source brute de recalcul dans les routes `GET`.
