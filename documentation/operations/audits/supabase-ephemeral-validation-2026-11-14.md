# Audit / HISTORY — validation Supabase éphémère du 14 novembre 2026

> **Statut : `AUDIT / HISTORY`.** Ce document conserve la chronologie et les
> preuves du chantier de déblocage CI. Il ne remplace pas les procédures
> `CURRENT` de [testing-platforms.md](../../development/testing-platforms.md),
> de [TESTING.md](../../development/TESTING.md) ou du [runbook de convergence
> Supabase](../runbook-supabase-convergence.md).

## Périmètre et décision finale

- Dépôt : `maxd4/CleanmyMap`, branche `main`.
- Projet Supabase de production concerné par l'audit amont : `trktzkgujgpgsgkoyndn`.
- Contraintes respectées : aucune écriture Production, aucun `db push` lié,
  `migration repair`, reset distant, DDL manuelle, lecture de secret ou
  démarrage Docker/WSL local.
- Dernier SHA publié au terme de la séquence :
  `120fb5b93d042575c1d11808de6d208ca8c31281`.
- État final : démarrage CI rétabli, replay et préflight PostgreSQL réussis,
  preuve pgTAP partiellement exécutée puis bloquée sur un défaut/incohérence
  de résolution `pgTAP` non attribuée avec certitude au fichier publié.
- Le chantier n'est pas une validation PostgreSQL complète : les contrats
  non atteints restent `NOT_RUN`; ils ne sont pas des succès implicites.

## 1. Audit de provenance des migrations Production

### Faits observés

| Élément | Preuve | Conclusion autorisée |
|---|---|---|
| État intermédiaire | Run `43590537023` : 442 migrations appliquées, 20 en attente | La convergence n'était pas atteinte à cette date. |
| État suivant | Run `43592739389` : `SUCCESS`, `PREFLIGHT_STATUS: ALIGNED`, 462 appliquées, 0 en attente, `db push SKIPPED` | Le workflow n'a pas appliqué les 20 migrations. |
| Base distante | Lecture directe : 462 versions enregistrées | Présence des versions dans l'historique distant confirmée. |
| Runtime Production | Deux tables de secrets HMAC présentes ; les 8 actions contrôlées ont `event_start_at` et `action_timezone` non nuls | Les effets read-only accessibles des trois DML contrôlés ne révèlent pas de défaut. Les valeurs HMAC n'ont pas été lues. |
| Déploiement Preview | SHA observé : `15a31ef3` | Preview n'est pas une preuve d'application Production. |
| Chronologie SQL | Exécution observée le 14/11/2026 entre 12:01:48 et 12:01:53 UTC | Fenêtre temporelle établie, acteur/processus non établi. |

### Limite de provenance

Les workflows `43590537023` et `43592739389` n'ont pas exécuté les 20
migrations. Les journaux d'audit GitHub/Supabase accessibles n'ont pas fourni
la commande, l'identité ou le job ayant produit l'application observée. La
provenance reste donc **non attribuable faute de trace disponible** ; cela ne
constitue pas une preuve d'application non autorisée.

`ALIGNED` prouve la concordance des versions enregistrées et l'absence de file
de migrations selon le préflight. Il ne prouve ni le contenu SQL réellement
exécuté, ni l'atomicité, ni les effets de triggers/RLS/RPC, ni la concurrence.

## 2. Chronologie des erreurs CI et solutions

Les liens renvoient aux runs GitHub ; seuls les artefacts publics contrôlés ont
été utilisés dans ce rapport. Les journaux bruts et les secrets ne sont pas
reproduits.

### 2.1 Démarrage Supabase

| Run / symptôme | Cause établie | Solution appliquée | Résultat |
|---|---|---|---|
| `43546311580` : échec à `Start ephemeral Supabase` après 85 s ; images, ports et Docker disponibles ; conteneurs temporaires vers 62 s puis disparus | Cause initiale non prouvée | Ajout d'un diagnostic borné, filtré et non secret : phase, catégorie, code, services, images/réseau, états synthétiques et premier signal | Diagnostic exploitable sans publier les logs bruts. |
| `43596079568` : `toomanyrequests: Rate exceeded` | Limitation de débit du registre ECR utilisé pour les images Supabase sur les runners GitHub | `SUPABASE_INTERNAL_IMAGE_REGISTRY: ghcr.io` dans la lane | Cause de démarrage démontrée et corrigée. |
| `43597467844` : `LegacyMigrationSeedError`, SQLSTATE `P0001`, fonction protégée refusant le seed | Le seed insérait des fixtures sans claims JWT `service_role`, alors que les fonctions d'écriture exigent cette frontière | Claims `service_role` transactionnels dans `apps/web/supabase/seed.sql`, sans exposer de secret | Le seed et le démarrage ont ensuite passé. |
| Diagnostics intermédiaires : signaux `proxy` trop larges ou sortie insuffisamment exploitable | Classification susceptible de confondre un nom de fichier bénin avec une erreur réseau/proxy | Regex resserrées, `first_error_signal` puis `first_error_excerpt` borné et redacted | Les diagnostics ne publient ni image, ni variable d'environnement, ni journal brut. |

### 2.2 Replay, préflight et réseau de preuve

| Run / symptôme | Cause établie | Solution appliquée | Résultat |
|---|---|---|---|
| `43598005669` : préflight échoue car le marqueur `RAISE NOTICE` n'est pas capturé comme résultat SQL | Le préflight dépendait d'une sortie de notice non fiable pour `supabase db query` | Marqueur retourné par une ligne de résultat SQL | Le préflight devient vérifiable par sortie structurée. |
| `43598498405` : erreur de prepared statement avec plusieurs commandes SQL | `supabase db query` n'accepte pas le lot multi-instructions utilisé pour le contrôle | Préflight réduit à une seule expression `SELECT` | `43598973331` passe le préflight. |
| `43598973331` : le conteneur pgTAP ne trouve pas le réseau | Le runner de preuve n'héritait pas du réseau Docker créé par la lane | Transmission de l'identifiant du réseau isolé à `run-supabase-sql-proof.mjs` | Le réseau est partagé explicitement et reste éphémère. |
| `43599633330`, `43600177012`, `43600762719` : `NOTESTS` malgré image disponible et réseau corrigé | Le conteneur `pg_prove` démarrait mais ne trouvait pas de fichier de test exécutable | Collecte de diagnostics de preuve plus précise, puis vérification de la résolution des chemins dans la CLI Supabase | La cause de chemin a été isolée au run suivant. |
| `43601255886` : `Cannot detect source ... IteratorFactory.pm` | Supabase CLI v2.117 résout les chemins positionnels depuis le checkout courant, pas depuis `--workdir` | Passage de chemins complets relatifs au checkout (`apps/web/supabase/tests/...`) | `43601688911` exécute réellement pgTAP. |

### 2.3 Contrats pgTAP et fixtures

| Run / symptôme | Cause établie | Solution appliquée |
|---|---|---|
| `43601688911` puis `43602946102` : appels `has_index` mal formés | Usage de signatures à trois arguments incompatibles avec la version pgTAP exécutée | Appels ramenés aux signatures pgTAP correctes ; permissions de fixture ajoutées lorsque nécessaires |
| `43603569677` : compte attendu des références de collecte `11`, résultat réel `13` | Oracle de test obsolète par rapport aux fixtures canoniques | Plan/attendu corrigé à `13` |
| `43604063577` : index attendu sur la mauvaise table et wrappers `ok(text, unknown)` | Le contrat visait `app_notifications` mais le test interrogeait une autre table ; des fonctions pgTAP directes étaient enveloppées à tort dans `ok` | Table corrigée ; assertions pgTAP directes conservées |
| `43604606702` : wrappers pgTAP incorrects encore présents | Même défaut de typage/assertion dans d'autres assertions | Suppression des wrappers restants et appels directs à `has_column`, `has_index` et fonctions équivalentes |
| `43605248805` : `has_column` à trois arguments et permission de fixture absente | Signature pgTAP incorrecte et fixture temporaire non lisible par le rôle d'exécution | Signature corrigée ; `GRANT SELECT` ajouté au rôle de preuve |
| `43605921192` : contrat de rétention échoue car `updated_at` devient récent | Le trigger de projection géométrique rafraîchissait `updated_at` lors de la fixture historique | Fixture marquée `gpxImport.intent = planned` pour éviter l'effet de projection ; plan ajusté de 15 à 14 |
| `43606415641` : `save_action_retrospective` échoue sur `ON CONFLICT(action_id)` ambigu | La RPC possède plusieurs contraintes/colonnes candidates et l'instruction ne ciblait pas une contrainte unique | Migration forward-only `20261114000004_fix_action_retrospective_upsert.sql`, avec `ON CONFLICT ON CONSTRAINT action_retrospectives_pkey` |
| `43607095835` : RPC de publication des rétrospectives échoue sur une référence ambiguë `action_retrospectives` | Variable ou alias en collision avec le nom de table dans le verrouillage et les mises à jour | Migration forward-only `20261114000005_fix_action_retrospective_publish.sql`, références de table qualifiées |
| `43608270808` : `max(id)` appliqué à un UUID dans le contrat rides | `max` n'est pas défini pour UUID | Fixture remplacée par une sélection déterministe d'un `id` |
| `43608933342` : assertion `like` utilisée avec l'API pgTAP SQL | `like` était le mauvais opérateur pgTAP pour le contrat | Remplacement par `alike` |
| `43609407889` : `integer` transmis à une RPC qui attend `smallint` | Le test ne respectait pas le type SQL de `update_action_ride_details` | Cast explicite `2::smallint` |
| `43609935377` : fixture temporaire du server boundary refusée par permission | Le rôle `service_role` n'avait pas le `SELECT` requis sur la table temporaire | Grant `SELECT` explicite pour la fixture |

### 2.4 Contrats statistiques et provenance temporelle

| Run / symptôme | Cause établie | Solution appliquée |
|---|---|---|
| `43610450337` : vue statistique publique ignore une fixture | `action_context_source` n'était pas explicite ; les invariants de projection excluent ce cas | Ajout de `action_context_source = 'explicit'` dans la fixture initiale |
| `43610913398` : scénario d'annulation non distinguable | La fixture réutilisait une action sans métadonnées de cancellation dédiées | Action secondaire dédiée avec métadonnées d'annulation explicites |
| `43611498498` : révocation/rétention échoue sur la provenance de contexte | La référence statistique n'avait pas `action_context_source = 'explicit'` | Provenance explicite ajoutée à la fixture et à sa mise à jour |
| `43612226810` : fixtures réputées anciennes devenues récentes ; `coalesce` scalaire incorrect | Des triggers actualisaient les dates ; l'expression de compteur ne gérait pas correctement l'absence de ligne | `as_of` dynamique dans le futur ; `coalesce((select ...), 0) + 1` |
| `43612959282` : propagation de version sans source de contexte explicite | Même invariant de provenance manquant dans la fixture initiale | `action_context_source = 'explicit'` ajouté |
| `43613537381` : assertions d'agrégat en échec après le plan de 34 tests | Types d'attendus incohérents avec le schéma réel des agrégats | Première correction de casts, puis revue des types réels |
| `43614105011`, `43614657941`, `43615239187` : successivement `is(bigint,numeric)` puis `is(numeric,bigint)` | Les casts avaient été appliqués au mauvais côté ou à la mauvaise assertion ; le schéma est `waste_kg numeric`, `participants_total bigint` | Types d'expressions réalignés sur la migration `20260908000001_incremental_public_impact_state.sql` |
| `43615766844` : surcharge pgTAP encore signalée malgré les casts | La comparaison `is` restait dépendante de la résolution de surcharge | Commit `d95ae5208` : comparaison booléenne explicite avec `ok(boolean,text)` |
| `43616305828` : même erreur signalée sous `is(numeric,bigint,unknown)` malgré le fichier `ok` publié | Le diagnostic de l'artefact ne concordait plus avec la source Git vérifiée au SHA | Commit `120fb5b93` : comparaison `is(text,text,text)` stricte, conforme au contrat pgTAP |
| `43617892838` : reproduction exacte du même `is(numeric,bigint,unknown)` sur `120fb5b93` | Le fichier GitHub contrôlé contient bien `is(text,text,text)`, mais l'artefact rapporte encore l'ancienne signature ; le chemin/bind ou le contenu effectivement monté par `pg_prove` n'est pas attesté | Aucun troisième correctif spéculatif. Blocage conservé pour collecte du chemin/bind et de l'empreinte du fichier réellement exécuté |

## 3. État des preuves au dernier run

Run : [43617892838](https://github.com/maxd4/CleanmyMap/actions/runs/43617892838)
sur `120fb5b93d042575c1d11808de6d208ca8c31281`.

| Étape | État |
|---|---|
| Installation Node, audit de l'arbre Supabase et inputs canoniques | `PASS` |
| Réseau Docker isolé | `PASS` |
| Démarrage Supabase éphémère | `PASS` |
| Replay migrations + seed | `PASS` |
| Préflight schéma PostgreSQL | `PASS` |
| pgTAP | `PARTIEL` : 14 fichiers `PASS`, puis 1 fichier `FAIL` |
| SQL contractuels | `NOT_RUN` après le premier échec pgTAP |
| Multi-session | `NOT_RUN` après le premier échec pgTAP |
| Playwright / E2E applicatifs | `NOT_RUN` |
| Nettoyage conteneurs, réseau et credentials éphémères | `PASS` |

L'artefact [public `cleanmymap-public-e2e-evidence`](https://github.com/maxd4/CleanmyMap/actions/runs/43617892838/artifacts/14123136135)
contient uniquement le rapport JSON redacted. Il indique le premier fichier
en échec `apps/web/supabase/tests/action-statistical-version-propagation.pgtap.sql`,
34 assertions planifiées, 33 observées et les tests 13–14 en échec. Aucun log
SQL brut, credential, cookie, JWT ou valeur HMAC n'a été publié.

## 4. Correctifs de sécurité et de gouvernance conservés

- Le registre pgTAP reste découvert automatiquement sous
  `apps/web/supabase/tests/`; aucun inventaire manuel parallèle n'a été créé.
- Les preuves SQL exigent les marqueurs d'environnement éphémère et refusent
  une URL Supabase liée ou Production.
- Le réseau de preuve est nommé par run/attempt et supprimé en fin de job.
- Les diagnostics de démarrage et d'échec sont bornés et redacted ; les logs
  bruts sont supprimés avant la fin du job.
- Les migrations de comportement sont forward-only ; aucune migration publiée
  n'a été réécrite.
- Les corrections `service_role` restent limitées au seed et au runtime
  éphémère ; aucun secret n'est injecté côté client ou dans un artefact public.
- Le document ne transforme pas les succès de démarrage, de replay ou de
  préflight en validation sémantique PostgreSQL complète.

## 5. Preuves manquantes et reprise autorisée

La prochaine action doit être diagnostique et ciblée, avant toute nouvelle
modification SQL :

1. enregistrer dans le rapport public une empreinte SHA-256 du fichier pgTAP
   lu par le runner, sans publier son contenu sensible éventuel ;
2. collecter le chemin positionnel, le répertoire de travail et le bind
   Docker réellement transmis à `pg_prove`, avec filtrage des chemins sensibles
   et des variables d'environnement ;
3. comparer cette empreinte et ce chemin au fichier
   `apps/web/supabase/tests/action-statistical-version-propagation.pgtap.sql`
   du SHA candidat ;
4. seulement si la matérialisation est identique, analyser la version pgTAP,
   la résolution de fonction et la valeur SQL produite ;
5. ne relancer ensuite la lane qu'une fois la cause démontrée.

Tant que cette comparaison n'est pas disponible, le statut correct est
`INTEGRATION_PROOF` partiel avec un premier échec, et non `ALIGNED`, `PASS` ou
`DB_SEMANTICS_NOT_EXECUTED` global.
