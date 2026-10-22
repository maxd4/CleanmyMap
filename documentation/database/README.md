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

Pour le classement des sources de stockage (Git, navigateur, Supabase, cache/ISR, Storage), voir **uniquement** `../architecture/data-governance.md` : aucun second tableau n'est maintenu ici. Les familles de tables sont inventoriées dans cette source et dans les migrations, pas dans cet index.
