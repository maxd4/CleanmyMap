# Database — Guide de référence

Point d'entrée pour les requêtes, index, RLS, stockage et diagnostics Supabase.

## Sources `CURRENT`

Lire d'abord :

1. [Gouvernance des données](../architecture/data-governance.md) — sources de
   vérité, stockage et contrats ;
2. [Supabase — optimisation des tables et requêtes](./supabase-table-optimization-playbook.md) —
   méthode de correction des lectures, index, RPC et agrégats ;
3. [Autorisation par capacités](../security/authorization-capabilities.md) —
   contrat d'accès cible et scopes.

Ces documents portent les règles durables. Les audits servent à mesurer ou
contextualiser un état ; ils ne créent pas une seconde doctrine.

## Audits et preuves

- [Supabase quota audit](./supabase-quota-audit.md) — audit de consommation et
  de risques ;
- [Supabase refresh strategy audit](../operations/audits/supabase-refresh-strategy-audit.md) —
  photographie historique de stratégie de rafraîchissement ;
- [Database query & index audit](./QUERY_INDEX_AUDIT.md) — audit requêtes/index ;
- [Supabase linked advisories](../security/supabase-linked-advisories-2026-05-20.md) —
  preuve liée aux advisors de sécurité.

Toujours confronter un audit daté au code et au schéma actuels avant d'en tirer
une décision.

## Ce que couvre ce domaine

- sources de vérité PostgreSQL ;
- migrations ;
- requêtes et index ;
- RLS et relations de données ;
- stockage Supabase ;
- lectures bornées ;
- vues, RPC et agrégats ;
- diagnostics de quotas ;
- compatibilités de schéma nécessaires au runtime.

## Tables centrales

Ces tables peuvent rester très sollicitées sans être des problèmes en soi. Le
bon réflexe est de borner les lectures, pas de masquer leur usage.

| Table | Usage principal | Garde-fou |
|---|---|---|
| `profiles` | identité, rôles, préférences | identifiant ou recherche ciblée, jamais scan large |
| `actions` | carte, création, import, modération, analytics | période, statut, zone ou type avant lecture large |
| `progression_profiles` | progression persistante | utilisateur ou RPC dédié |
| `progression_events` | journal de progression/audit | ne pas recalculer tout le système depuis ce journal |
| `user_points` | solde courant | résumé ou agrégat |
| `points_ledger` | historique des points | pagination ou agrégat |
| `community_events` | événements | date, statut ou géographie |
| `event_rsvps` | RSVP | événement ou utilisateur |
| `action_participants` | participations | action, utilisateur ou période |
| `app_notifications` | notifications | utilisateur courant, limite et tri |
| `quiz_type_progress` | progression quiz | utilisateur et type |
| `quiz_srs` | répétition espacée | utilisateur et questions ciblées |
| `checklist_progress` | checklists | `(user_id, checklist_id)` |
| `runbook_checks` | runbooks | profil ciblé |
| `user_badge_totals` | agrégats badges | utilisateur, pas scan de classement brut |

Règle commune :

- pas de `select("*")` par défaut sur un chemin croissant ;
- pas de lecture complète pour un simple compteur ;
- réutiliser une vue, RPC ou agrégat lorsqu'une synthèse existe ;
- une table d'agrégat ne doit pas redevenir la matière première d'un recalcul
  complet à chaque `GET`.

## Migrations

Le schéma versionné canonique reste celui défini par la gouvernance du dépôt et
[`../architecture/data-governance.md`](../architecture/data-governance.md).

Toute évolution doit préserver :

- migration versionnée ;
- types ;
- RLS ;
- consommateurs runtime ;
- tests ;
- compatibilités nécessaires.

Ne jamais corriger un quota en modifiant directement la base distante sans
migration associée.

## Choix du stockage

Ne pas maintenir une seconde matrice ici.

La décision canonique est dans
[`../architecture/data-governance.md`](../architecture/data-governance.md) :

```txt
Git / statique
navigateur
Supabase
cache / ISR
Storage / fichier préparé
```

## Validation

Pour une modification Supabase :

1. qualifier le chemin réel ;
2. appliquer le playbook ;
3. préserver la sécurité et les contrats ;
4. exécuter les tests et audits pertinents du dépôt actuel ;
5. ne pas utiliser un ancien rapport comme preuve de l'état présent.
