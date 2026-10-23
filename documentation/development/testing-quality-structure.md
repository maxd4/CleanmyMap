# Duplication, cycles et GitNexus

> Module associé à [testing-quality.md](./testing-quality.md). Statut : `CURRENT` — audits structurels.

## Duplication et cycles

La duplication est mesurée par `jscpd` 5.3.0 avec des baselines natives
séparées pour le runtime, les tests et les data/fixtures, ainsi qu'une baseline
métrique dans `scripts/checks/duplication-metrics-baseline.json`. Cette dernière
contient le fingerprint SHA-256 de la politique courante. Toute modification de
l'outil, de sa version, des seuils, des scopes, des patterns ou des exclusions
rend la baseline métrique stale ; son évolution doit être ratifiée explicitement.
Les snapshots, fichiers générés, vendors et duplications de fixtures
volontairement répétitives ne sont pas traités comme de la dette runtime. Les
baselines natives jscpd sont des ratchets versionnés : elles représentent
l'ensemble des fingerprints acceptés à un commit donné et ne sont jamais mises
à jour automatiquement par `quality:duplication`. La commande :

```bash
npm run quality:duplication
```

réutilise les fingerprints natifs jscpd et compare aussi les blocs, les lignes
et les tokens dupliqués à la baseline métrique. Tout nouveau fingerprint de
clone non qualifié (`NEW_CLONE_FINGERPRINTS > 0`) est bloquant pour le runtime et
les tests ; les fixtures/data restent strictes. Un fingerprint CURRENT nouveau
peut toutefois être qualifié dans `duplication-justifications.json` si ses deux
occurrences réelles sont relues et couvertes par la preuve ; cette qualification
ne modifie aucune baseline et le compteur `NEW_CLONE_FINGERPRINTS` est alors
calculé sur les fingerprints non qualifiés. Les clones déjà présents dans les
baselines natives restent historiques. Une réduction validée est acquise explicitement
sur le commit mesuré avec `--baseline <baseline-file> --update-baseline`, en
conservant exactement les mêmes scopes, patterns, seuils, ignores et version
jscpd. Un fingerprint supprimé qui réapparaît ensuite devient un nouveau
fingerprint bloquant. Le fingerprint de politique
(`DUPLICATION_POLICY_FINGERPRINT`) reste un invariant distinct et strict.
Un clone historique reste donc une dette et ne constitue pas une justification
implicite. Une duplication volontaire nécessitant une protection doit faire
l'objet d'une décision explicite et d'un garde-fou dédié, sans exclusion,
relèvement de seuil ou abstraction artificielle ajoutée uniquement pour
satisfaire jscpd. Les décisions `KEEP_INTENTIONAL` sont enregistrées dans
`scripts/checks/duplication-justifications.json` avec le fingerprint natif, une
raison, une preuve et un SHA complet de revue. Le contrôle vérifie que le
fingerprint existe dans la baseline native ou dans le rapport CURRENT SARIF,
et que la preuve couvre les deux occurrences CURRENT ; une justification
disparue produit `STALE_KEEP_INTENTIONAL` ou `STALE_NO_ACTION_NOISE` et bloque.
Un fingerprint nouveau et non qualifié reste bloquant ; une qualification
explicite ne relève ni seuil, ni baseline, ni exclusion.

Dans la CI FULL, le step `quality:duplication` du job `web-quality` doit produire
sa preuve sur tout candidat concerné dès que le checkout, Node et `npm ci` ont
réussi et que le job n'est pas annulé. Il reste exécutable même lorsqu'un
ratchet structurel précédent du même job a échoué ; son propre échec reste
`FAIL` et doit faire échouer `web-quality`. Un environnement non préparé ou une
annulation produit `SKIPPED`, jamais une validation implicite. Un jscpd non
exécuté ne doit donc jamais être présenté comme `PASS` ou comme une preuve
acquise.

La stabilisation court terme de la CI quotidienne distingue trois résultats :
`PASS`, `PASS_WITH_GRACE` et `FAIL`. `PASS_WITH_GRACE` accepte uniquement une
hausse des métriques absolues calculée contre la même baseline historique et
dans l'enveloppe versionnée : runtime `+0,05` point de pourcentage et `+80`
lignes / `+800` tokens ; tests `+0,15` point et `+150` lignes / `+1 500`
tokens. Cette grâce ne s'applique jamais aux nouveaux fingerprints ni aux
fixtures/data ; elle est non cumulative et ne modifie ni ne renouvelle la
baseline. Dépasser une seule limite redevient bloquant (`FAIL`). Aucune hausse
de baseline, de seuil ou d'exclusion ne peut servir à faire passer un lot.

La sortie expose par scope le statut, les nouveaux fingerprints et les deltas
réels de lignes, tokens et pourcentages. Les `KEEP_INTENTIONAL` restent
présents dans la baseline native et sont documentés séparément dans
`scripts/checks/duplication-justifications.json` ; ils ne peuvent jamais
autoriser un nouveau fingerprint. Aucun seuil, ignore ou grace ne peut être
relevé pour masquer une régression.

Le contrôle de cycles est officiellement suspendu jusqu'à réactivation
explicite. `quality:cycles` et `audit:gitnexus:cycles` retournent
`SKIPPED_BY_POLICY`, avec une preuve rattachée au candidat courant, sans
installer GitNexus, construire d'index ou prétendre avoir mesuré l'absence de
cycles. Le contrôle conserve donc un état explicite et ne devient jamais un
`PASS` implicite :

```bash
npm run quality:cycles
```

La politique est portée par `scripts/audits/quality-audit-policy.mjs` et
réutilisée par les runners, le résumé CI et la projection de fichiers. Tant
qu'elle est active, aucun rapport complet de cycles n'est produit ; une
exécution `FULL` conserve donc cette dimension comme `SKIPPED_BY_POLICY`, et
non comme une couverture ou un `PASS`. La réactivation devra être un lot
explicite qui rétablira la preuve GitNexus et ses validations sans modifier les
seuils, baselines ou critères du gate.

### GitNexus ciblé pendant DEVELOPMENT

GitNexus est un accélérateur facultatif de découverte et d'analyse d'impact ;
il ne constitue ni une source de vérité, ni un remplacement de la lecture du
code, de TypeScript, des tests, des contrats métier ou de la documentation.
Pour une correction locale simple, ne pas l'imposer. Pour une modification
transversale, l'utiliser seulement lorsqu'il apporte une valeur concrète, avec
la séquence bornée suivante :

1. identifier la responsabilité, son owner canonique, les consommateurs et le
   SHA candidat ;
2. vérifier l'index utilisé : dépôt, `lastCommit`, version, configuration et
   fraîcheur par rapport au SHA candidat ;
3. si l'index est périmé, ne jamais interpréter une absence de résultat comme
   une absence de dépendance ; privilégier `rg`, les imports, les callers, les
   contrats et les tests actuels ;
4. interroger `query` pour retrouver les symboles ou les processus pertinents,
   puis `context` et `impact` uniquement sur les symboles retenus ; tenir
   compte des limites FTS et de l'absence éventuelle de recherche vectorielle ;
5. utiliser `trace` ou `detect_changes` seulement lorsque leur contrat et leur
   fonctionnement ont été vérifiés pour l'index courant ; leurs résultats
   restent des signaux à confronter au code réel ;
6. fixer le périmètre réel du changement après confrontation aux
   implémentations, consommateurs, tests et documentation.

La décision de fraîcheur est déterministe :

- `INDEX_CURRENT` : `lastCommit` est le SHA candidat, le runner et les
  métadonnées attendues sont compatibles, et aucun changement local ne rend
  l'arbre ambigu ; les requêtes contextuelles peuvent orienter l'analyse ;
- `INDEX_PARTIALLY_STALE` : le SHA indexé est celui du candidat mais des
  modifications locales existent ; le graphe ne sert qu'à orienter la recherche
  et toute relation pertinente doit être confirmée dans le code courant ;
- `INDEX_STALE` : le graphe vise un autre commit ou des métadonnées incompatibles
  ; une absence de consumer, d'impact ou de cycle ne peut jamais être conclue ;
- `INDEX_UNAVAILABLE` : index, runner ou MCP indisponible ; utiliser `rg`, Git,
  TypeScript et les tests ciblés sans bloquer `DEVELOPMENT` pour cette seule
  raison.

Un index `INDEX_STALE` ou `INDEX_PARTIALLY_STALE` ne déclenche pas `FULL` et ne
justifie pas une réindexation automatique. Une réindexation est une action
explicite, réservée à une analyse transversale importante ou au candidat final
stabilisé de `FULL`, après contrôle de la licence, des processus concurrents et
de la séparation staged/unstaged. Les états `INDEX_CURRENT` et les preuves
réutilisées doivent toujours appartenir au même candidat ; aucun `PASS` ne peut
provenir d'un autre SHA.

Une réindexation locale n'est jamais automatique avant un commit. Elle ne peut
être envisagée que pour une analyse importante, après séparation explicite des
changements staged/unstaged et vérification de l'absence de processus qui
pourrait rendre l'index ambigu ; la propreté n'est pas requise pour poursuivre
les autres validations. Elle ne doit jamais écraser, restaurer ou modifier les
fichiers staged ou unstaged préexistants.
Les cycles globaux restent documentés par `quality:cycles`, mais ce contrôle
est `SKIPPED_BY_POLICY` jusqu'à nouvel ordre ; aucune requête GitNexus d'impact
ne devient un contrôle bloquant de pré-commit ou de pré-push.

#### Qualification d'usage GitNexus

L'intégration observée utilise GitNexus `1.6.12`, soumis à la licence
[PolyForm Noncommercial 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0).
Pour le périmètre déclaré par le porteur du projet — projet étudiant à but non
lucratif consacré à la protection de l'environnement — l'usage courant est
qualifié `LICENSE_AUTHORIZED_FOR_CURRENT_USE`. La licence autorise les usages
non commerciaux et prévoit explicitement un usage permis par les établissements
éducatifs et les organisations de protection de l'environnement, quelle que
soit la source du financement ou les obligations qui en découlent.

Cette qualification est limitée à l'usage local de développement et d'analyse
décrit ici. Elle ne vaut pas autorisation commerciale générale et doit être
réévaluée si le projet, son opérateur, son financement ou sa finalité change.
La licence `AGPL-3.0-only` de CleanMyMap reste inchangée : elle ne couvre pas
GitNexus, mais il n'est pas nécessaire de modifier la licence du projet pour
utiliser cet outil tiers dans le périmètre autorisé. Aucun second index, hook,
plugin ou service n'est ajouté.

#### Mesure de valeur GitNexus

Une mesure comparative a été conduite sur `main` au SHA
`b0807967e7cf8516c3099621ffb86ebdf1bb7a7a`, sans `FULL`, sans modification de
fonctionnalité et sans rejouer artificiellement l'état historique des commits.
Les cas retenus sont des changements réels de l'historique :

| Cas | Commit étudié | Responsabilité | Méthode ordinaire | Résultat GitNexus vérifié par le code |
| --- | --- | --- | --- | --- |
| A | `2be248e545b8f70e189f971b797ab792aa3760af` | contrat cartographique `/api/actions/map`, DTO, cache, UI et tests | `0,435 s`; 17 fichiers modifiés; 10 fichiers contenant `fetchMapActions`, 13 l'URL de route et 9 `ActionMapResponse` | `NOT_DETECTED` pour la route et `buildMapActionsRouteResult`; aucun consommateur pertinent; route mapping absent |
| B | `e853005e4f70d0f3eac606d7d1a40d307b423c80` | extraction Chat serveur/client | `0,469 s`; 16 fichiers modifiés; 4 modules `route.post-*`, 19 fichiers avec `useChatShell` | `NOT_DETECTED` pour `POST`; 3 processus `SignalementMedia` hors sujet observés en faux positifs |
| C | `915df2d7592d3d15c804df6f9fb0cf2e0b404727` | migration RLS Supabase de `action_geometry_contributions` | `0,410 s`; 5 fichiers modifiés; 17 références de table, 2 références RPC et 3 références de policy | `NOT_DETECTED` pour `recordActionGeometryContribution`; 5 processus `POST` hors sujet observés en faux positifs |

Les temps ordinaires mesurent les commandes Git et `rg` de découverte, pas le
temps de lecture humaine. Les nombres de fichiers sont des ancres retournées
par les recherches, pas une prétention de mesurer les tokens ou le coût interne
de Codex. Les relations importantes ont été confirmées dans le code :

- A : `map-http.ts:423` définit `fetchMapActions`,
  `use-map-feed-data.ts:113` l'appelle, et `app/api/actions/map/route.ts:47`
  appelle `buildMapActionsRouteResult` ;
- B : `app/api/chat/route.post.ts:10-24` importe les quatre modules extraits,
  tandis que `components/chat/chat-shell.tsx:7-107` importe et appelle les
  hooks de shell ;
- C : `action-geometry-contribution-workflow.ts:3,114` utilise le propriétaire
  RPC défini dans `record-action-geometry-contribution.ts:61-65`, et la
  migration `20261003000010_optimize_action_geometry_contributions_rls.sql:4`
  modifie explicitement la policy service-only.

La première passe GitNexus a utilisé l'index `13476c59a44df4839155714b9871931b5cf54d6e`,
classé `INDEX_STALE` avec deux commits de retard. Une réindexation locale
explicitement déclenchée pour mesurer son coût a pris `132,2 s` de temps mur
(`44,9 s` annoncées par l'analyseur), pour `66 020` nœuds, `198 091` arêtes,
`1 507` communautés et `1 068` flux. Elle a rendu l'index courant sur
`b0807967…`, mais la construction FTS/BM25 a échoué sur
`Property.property_fts`, avec `embeddings: 0`, et la recherche textuelle a été
désactivée. Après cette opération, le transport MCP s'est fermé ; les appels
suivants sont donc `BLOCKED_ACCESS`, et non des preuves d'absence de relations.

Statuts de preuve :

- `CONFIRMED` : les relations décrites ci-dessus sont vérifiées par imports,
  appels, contrats ou migration dans le checkout courant ;
- `NOT_DETECTED` : GitNexus n'a pas retrouvé la relation ciblée ; avec FTS
  désactivé, un index fraîchement écrit mais un MCP indisponible, ce statut ne
  signifie pas « aucun consumer » ;
- `FALSE_POSITIVE` : les processus hors domaine listés dans B et C n'étaient
  pas liés aux fichiers des commits étudiés ;
- `NOT_COMPARABLE` : un graphe au HEAD ne rejoue pas les consommateurs tels
  qu'ils existaient avant ou après chacun des commits historiques ;
- aucun consommateur important n'a été trouvé uniquement par GitNexus dans
  cette mesure.

Décision : `AUDIT_ONLY`. Les outils ordinaires sont actuellement plus rapides,
plus explicables et plus fiables pour les trois catégories mesurées. GitNexus
reste disponible pour `FULL` et pour une analyse ciblée exceptionnelle lorsque
son index est `INDEX_CURRENT`, que le MCP et les métadonnées sont sains, et que
chaque relation est ensuite confirmée par le code. Cette mesure ne justifie ni
un usage généralisé en `DEVELOPMENT`, ni une réindexation avant chaque lot.
