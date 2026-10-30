# Database — index de responsabilités

**État : `CURRENT` pour l'orientation**, pas pour un inventaire figé du schéma. Le SQL versionné, les migrations, les RPC, les règles de données et les tests propriétaires prévalent sur tout résumé de ce dossier. La présence d'une migration Git ne prouve pas son application sur une base distante.

## Lecture ciblée

| Question | Source canonique | Vérification |
|---|---|---|
| Sources de vérité, familles de données et stockage | [`../architecture/data-governance.md`](../architecture/data-governance.md) (`CURRENT`) | Types, contrats, code, migrations `apps/web/supabase/migrations/` |
| RLS et permissions réellement appliquées | [`../security/authz-authn-regles.md`](../security/authz-authn-regles.md) (`CURRENT`) et [`../security/supabase-review-checklist.md`](../security/supabase-review-checklist.md) | SQL, AuthZ serveur, clients `service_role`, tests d'accès négatifs |
| Capacités et scopes proposés | [`../security/authorization-capabilities.md`](../security/authorization-capabilities.md) (`PLAN / TARGET`) | Aucune permission actuelle ne se déduit de cette cible |
| Requêtes, index, RPC et agrégations | [`supabase-table-optimization-playbook.md`](./supabase-table-optimization-playbook.md) (`CURRENT`, méthode) | Plan `EXPLAIN`, requête cible, volumétrie et RLS du flux |
| Quotas et coûts | [`supabase-quota-audit.md`](./supabase-quota-audit.md) (`AUDIT`) | Observations datées ; revalider le service et les accès |
| Requêtes et index historiques | [`QUERY_INDEX_AUDIT.md`](./QUERY_INDEX_AUDIT.md) (`AUDIT`) | Ne pas reconduire une mesure historique sans exécution |
| Transactions et opérations atomiques | [`ATOMIC_OPERATIONS_AUDIT.md`](./ATOMIC_OPERATIONS_AUDIT.md) (`AUDIT`) | Runtime, migrations et tests PostgreSQL lorsque disponibles |
| Revue Supabase historique | [`../security/supabase-linked-advisories-2026-05-20.md`](../security/supabase-linked-advisories-2026-05-20.md) (`SNAPSHOT`) | Advisors réellement consultés et datés |
| Actualisation des données | [`../operations/audits/supabase-refresh-strategy-audit.md`](../operations/audits/supabase-refresh-strategy-audit.md) (`AUDIT`) | Consommateurs et coûts d'actualisation actuels |

## Invariants pour les changements

1. Partir du chemin de lecture/écriture réel et de son propriétaire : API, client navigateur/mobile, import, RPC, fonction ou trigger. Ne jamais transformer une table d'audit, une projection ou un cache en source métier concurrente.
2. Pour une requête croissante, borner le périmètre (utilisateur, action, période, territoire, statut), sélectionner les colonnes utiles et vérifier pagination, volume et index. Un compteur n'exige pas l'export complet de sa table.
3. Préserver AuthN/AuthZ serveur, ownership, RLS, permissions des fonctions, restrictions de Storage et projection publique. `service_role` est une capacité technique serveur, **pas** une autorisation utilisateur.
4. Les modifications persistantes passent par l'unique arbre canonique de migrations et impliquent consommateurs, types, tests et rétrocompatibilité justifiée. Ne jamais appliquer un correctif silencieux directement sur une base distante.
5. Distinguer explicitement `STATIC_CONTRACT`, test exécuté et validation transactionnelle PostgreSQL. Si les contraintes, triggers ou règles RLS n'ont pas été exécutés, déclarer `DB_SEMANTICS_NOT_EXECUTED`.

### CURRENT — besoins structurés d'action (6A1)

La représentation persistante canonique des besoins est `public.action_needs`.
Elle porte les huit valeurs exactes de `COMMUNITY_HELP_CATEGORIES`, les
statuts persistés `open`, `fulfilled` et `cancelled`, ainsi que les contraintes
de longueur, de date et de cohérence de `fulfilled_at`. `expired` est une
projection de lecture lorsque `status = open` et que `expires_at < now()` ; il
n'est jamais persisté.

La table est protégée par RLS et aucun rôle navigateur (`anon` ou
`authenticated`) ne dispose d'une écriture directe. Les mutations passent par
un service serveur authentifié et autorisé ; les routes communautaires
réutilisent cette représentation sans créer une seconde table ou un second
statut effectif.

Pour le classement des sources de stockage (Git, navigateur, Supabase, cache/ISR, Storage), voir **uniquement** `../architecture/data-governance.md` : aucun second tableau n'est maintenu ici. Les familles de tables sont inventoriées dans cette source et dans les migrations, pas dans cet index.

### CURRENT — préférences d'aide et suggestions (6A4)

`public.community_helper_skills` est la représentation canonique des catégories
d'aide choisies volontairement par un membre. Elle utilise exclusivement
`COMMUNITY_HELP_CATEGORIES`, reste privée par utilisateur sous RLS et ne crée
ni annuaire, ni badge, ni score. Les routes `GET` et `PUT`
`/api/community/helper-skills` lisent et remplacent l'ensemble via la RPC
serveur atomique ; l'identité vient uniquement de la session.

`GET /api/community/needs/suggestions` réutilise la projection publique
canonique des besoins. Il ne sélectionne que les besoins ouverts, non expirés
et réellement publiés, correspondant aux catégories choisies. Le territoire
préféré et ses voisins canoniques ordonnent les résultats sans exclure les
autres territoires. Aucune notification n'est générée par ce lot.

### CURRENT — digest communautaire in-app

`public.community_digest_runs` est la trace canonique d'une génération de
digest par membre, cadence et période. Les périodes sont calculées en
`Europe/Paris` : `daily` utilise `YYYY-MM-DD` et `weekly` utilise l'année et
la semaine ISO (`YYYY-Www`), y compris aux frontières d'année et de changement
d'heure. L'unicité `(user_id, cadence, period_key)` rend les retries
idempotents.

Le refresh `POST /api/community/digest/refresh` est authentifié, limité et
déclenché depuis le parcours communautaire. Il consulte d'abord les
abonnements actifs et les exécutions déjà enregistrées ; une période traitée
ne relance pas l'agrégation. Les dates canoniques d'entrée dans la visibilité
sont `published_at` pour les futures actions et les résultats publiés, et le
maximum entre `published_at` de l'action et `created_at` du besoin pour les
besoins. Seules les références publiques dues, dédoublonnées et limitées à dix
entrées sont transmises à la RPC.

La RPC `commit_community_digest_run` est réservée à `service_role` : elle
verrouille la clé logique, persiste le run et crée, dans la même transaction,
zéro notification pour un résultat vide ou une notification `community` unique
pour un résultat non vide. Aucun cron, email ou abonnement implicite n'est
introduit. Les contrats SQL statiques et le pgTAP sont présents ; leur
exécution PostgreSQL reste à distinguer dans les preuves de validation.
