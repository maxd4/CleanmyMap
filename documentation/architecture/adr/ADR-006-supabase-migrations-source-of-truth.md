# ADR-006 — Source de vérité des migrations Supabase

**Statut : accepté et appliqué**
**Date : 11 juillet 2026 — application : 24 août 2026**

## Contexte

Deux arbres de migrations existaient avant l'application de cet ADR :

```txt
apps/web/supabase/migrations/
supabase/migrations/
```

Le workspace web possède :

```txt
apps/web/supabase/config.toml
```

et le script :

```txt
npm run backend:supabase:push -w apps/web
```

exécute Supabase avec :

```txt
--workdir .
```

depuis `apps/web`.

Plusieurs tests lisent également les migrations sous `apps/web/supabase/migrations/`.

## Problème

Deux arbres éditables manuellement créent un risque de divergence :

- migration ajoutée dans un seul dossier ;
- test lisant un arbre différent du CLI ;
- base distante non alignée avec la documentation ;
- agent modifiant le mauvais fichier.

## Décision proposée

Déclarer comme source canonique :

```txt
apps/web/supabase/
```

notamment :

```txt
apps/web/supabase/config.toml
apps/web/supabase/migrations/
```

Le dossier racine historique :

```txt
supabase/migrations/
```

est supprimé après comparaison contrôlée. Il ne doit plus être recréé.

## Vérifications d'application

La suppression du miroir a été précédée par :

1. une comparaison exhaustive des noms, contenus et ordre ;
2. l'identification et le transfert des quatre migrations présentes uniquement
   dans le miroir ;
3. la vérification des références de tests, scripts et documentation ;
4. la validation du workspace Supabase canonique ;
5. l'activation d'un garde-fou qui échoue si le miroir racine réapparaît.

La migration `20260625000001_territory_metadata_compatibility.sql` a été
transférée sous le nom `20260625000005_territory_metadata_compatibility.sql`,
car le timestamp `20260625000001` était déjà utilisé dans l'arbre canonique.
Le contenu SQL est inchangé.

## Migration documentaire

Mettre à jour :

```txt
les consignes d'agent applicables au dépôt
documentation/architecture/data-governance.md
documentation/development/TESTING.md
documentation/security/*
apps/web/README.md
```

## Tests

Les tests de migration lisent uniquement la source canonique après bascule.
Le garde-fou `npm run audit:supabase-migration-trees` vérifie que le dossier
racine interdit est absent et qu'aucun timestamp de migration n'est dupliqué.

## Conséquences

Après application complète :

- un seul arbre éditable : `apps/web/supabase/migrations/` ;
- CLI, tests et docs alignés ;
- moins de risque d'agent sur le mauvais chemin.

## Immutabilité publiée et correction d'une réécriture historique

Une migration présente sur `main` ou déjà enregistrée dans l'historique d'une
base est un artefact historique immuable. Son contenu ne doit pas être modifié
pour corriger après coup une RPC, une fonction, un trigger, un grant ou une
règle métier. Supabase ne rejoue pas une version déjà enregistrée : une base
qui a appliqué l'ancien contenu conserverait donc l'ancien contrat, tandis
qu'une reconstruction complète recevrait le contenu modifié. Ces deux bases
divergentes sont précisément le défaut que l'append-only doit empêcher.

La procédure obligatoire est la suivante :

1. si le fichier historique a été réécrit par erreur, restaurer exactement un
   contenu publié retrouvé dans l'historique Git et conserver la preuve des
   empreintes inspectées ;
2. créer la prochaine migration disponible dans l'unique arbre canonique ;
3. porter la correction runtime dans cette migration additive, par exemple
   avec `CREATE OR REPLACE FUNCTION`, `ALTER`, un nouveau trigger ou une
   contrainte compatible ;
4. relire les migrations suivantes afin de vérifier la compatibilité de la
   nouvelle définition avec leurs triggers, procédures, contraintes et grants ;
5. valider séparément une reconstruction complète et une mise à niveau depuis
   la dernière migration historique publiée avant la correction.

La restauration stricte d'une réécriture accidentelle est une réparation
exceptionnelle et traçable ; elle ne donne pas l'autorisation de modifier une
migration publiée pour y placer un correctif runtime. L'application normale
des migrations canoniques est automatique dès que la cible, l'historique, le
dry-run et les contrôles de sécurité ont été réconciliés selon les règles
Supabase du dépôt ; elle ne nécessite pas une confirmation supplémentaire par
lot. `migration repair`, une DDL manuelle et toute autre écriture distante
restent hors de cette délégation. Le garde
`npm run audit:supabase-migration-trees` et les hooks de publication doivent
être exécutés sur le candidat exact ; ils complètent la revue et ne remplacent
pas la vérification de convergence des deux historiques.

## Exception bornée de rejouabilité — `20260913000006`

Le principe append-only reste la règle générale. Une exception locale est
acceptée pour rendre rejouable une migration historique déjà appliquée lorsque
son seul bloqueur est l'absence des données historiques qu'elle réparait.
Cette exception ne crée aucune nouvelle application distante de la version et
ne constitue pas une permission générale de réécrire les migrations publiées.

La migration `20260913000006_restore_historical_waste_null_semantics.sql` est
concernée par cette exception : le projet Supabase lié
`trktzkgujgpgsgkoyndn` l'a déjà enregistrée comme appliquée, et les statements
distants enregistrés correspondent à la version historique précédemment
versionnée. La correction locale est limitée au bloc qui traite les cinq
identités historiques et respecte les conditions suivantes :

1. les cinq identités ont chacune zéro correspondance : le patch historique
   `waste_kg` est ignoré, aucune donnée n'est créée ni modifiée, puis les
   fonctions suivantes de la migration sont exécutées ;
2. les cinq identités ont chacune une correspondance unique : les contrôles de
   provenance et de valeur préexistante ainsi que la correction `waste_kg` sont
   conservés ;
3. toute autre cardinalité, notamment un historique partiel ou une identité
   dupliquée, échoue explicitement et fail-closed avant le DML historique.

Les valeurs et identités historiques ne sont pas modifiées par cette
exception, aucune donnée fictive n'est créée et les migrations `000007`,
`000008` et `000009` restent inchangées. Les empreintes Git de la migration
`000006` sont conservées pour la traçabilité :

```text
000006_BEFORE_HASH: 64e1063950ea69fb6e70b70fc2f23edff0c5abf8
000006_AFTER_HASH:  1983bedb04b443d7c348242a6c98b61e6aaf46b0
```

Cette exception est un changement de source versionnée uniquement. Elle
n'autorise ni `supabase migration repair`, ni `db push`, ni écriture sur le
projet distant ; toute publication ultérieure reste soumise à une revue et à
une validation distinctes.

## Exception syntaxique bornée — `20260926122042`

Une exception strictement spécifique est acceptée pour la migration
`20260926122042_relocate_action_chat_rls_helpers.sql`, déjà publiée dans Git
mais jamais appliquée au projet Supabase canonique `trktzkgujgpgsgkoyndn`.
Sa syntaxe invalide dans la policy `chat_poll_votes_update_own` empêche sa
première application et tout replay ultérieur avant que les migrations
suivantes puissent être atteintes.

La correction autorisée est purement syntaxique : fermer le bloc `using` avant
`with check`. Elle ne modifie aucune condition, policy, permission ou autre
sémantique RLS, ne réécrit pas l'historique distant et n'autorise ni
`supabase migration repair`, ni `db push`, ni aucune mutation distante.
Cette exception ne généralise pas le droit de modifier les migrations
publiées ; toute autre correction d'une migration historique reste soumise au
principe append-only et aux conditions du présent ADR.

## Exception syntaxique bornée — `20261030000024` et `20261030000026`

Une seconde exception syntaxique strictement bornée est acceptée pour la
première application des migrations d'offres d'aide. L'historique distant du
projet Supabase canonique `trktzkgujgpgsgkoyndn`, relevé le 30 octobre 2026
avec `supabase migration list --linked` et la liste des migrations du projet,
s'arrête à `20261030000023`. Les versions locales `20261030000024` à
`20261030000028` sont donc absentes de l'historique distant ; aucune de ces
versions n'a été appliquée dans ce lot.

La provenance de `20261030000027_community_digest_runs.sql` est documentée
séparément : le fichier a été introduit par `61285a3b7ecbb784cc86c8d9cf0b4f3e8a40644a`
(`feat: ajouter le digest communautaire in-app`), après la base de revue
`9d43762f50651536d019ac7a9f23b542d9fb5db9`, où il était absent. Il est
désormais présent dans `main` publié par l'ascendance de ce commit ; cette
provenance ne fait pas partie de l'exception syntaxique des migrations d'offres.

La première tentative a uniquement déplacé la clause `INTO` immédiatement
après `SELECT`. Elle reste invalide : PostgreSQL/PL/pgSQL n'accepte pas deux
variables `%ROWTYPE` composites (`v_need, v_action`) comme cibles d'une même
liste `SELECT INTO`. Les empreintes `AFTER_HASH` de cette tentative sont
conservées comme historique d'une tentative échouée, mais retirées du garde
d'immutabilité et ne constituent plus une réécriture approuvée.

La correction bornée utilise une seule destination `record`, puis affecte les
deux `%ROWTYPE` après le contrôle immédiat de `FOUND`, sans modifier les
expressions, jointures, prédicats, `FOR UPDATE OF n, a`, l'ordre de verrouillage
ou les transitions :

```text
select n as need_row, a as action_row
  into v_locked
  ...

if not found then
  -- exception existante inchangée
end if;
v_need := v_locked.need_row;
v_action := v_locked.action_row;
```

Cette correction s'applique aux deux occurrences de
`20261030000024_action_need_offers.sql` et à l'unique occurrence de
`20261030000026_action_need_offers_need_identity.sql`. Elle conserve les
signatures RPC, l'autorisation `service_role`, l'idempotence, les notifications
et les identités `needId`/`offerId`.

```text
DECLARE
  v_locked record;
  v_need public.action_needs%rowtype;
  v_action public.actions%rowtype;

SELECT n AS need_row, a AS action_row
  INTO v_locked
  FROM public.action_needs n
  JOIN public.actions a ON a.id = n.action_id
 WHERE n.id = ...
 FOR UPDATE OF n, a;

-- FOUND est vérifié immédiatement avant ces affectations.
v_need := v_locked.need_row;
v_action := v_locked.action_row;
```

Les empreintes SHA-256 UTF-8 des fichiers complets sont conservées ci-dessous :

```text
20261030000024_BEFORE_HASH: 70ff40ecf4177fc75e486d5ad8305e4a301b61cc8353feb4024037a79966f381
20261030000026_BEFORE_HASH: da1d33e376e88b784639c1c0dc3d56c80a663c661738ca6fbcdab531c3f2fea8
20261030000024_FAILED_ATTEMPT_HASH: 2628f5923c39cfbcf5aa1398878517985d1c0ce80deb97ebd6a862f626b1a184
20261030000026_FAILED_ATTEMPT_HASH: fd19d17dfa2cce0ac10a8f2193c34a32e518b9a710bb8feb920e96f0f6a51f15
20261030000024_AFTER_HASH: e04593971d7c4bea0a89645d96d1c3c8ec409e1b5e4d9b75906d6bc98d1f310c
20261030000026_AFTER_HASH: 5dcec92626543ce7aff34277db4d90220404bfabdfbb6ff99452fdf90a1fa09f
```

Seules les deux nouvelles empreintes `AFTER_HASH` sont autorisées par le garde
d'immutabilité. Les deux `FAILED_ATTEMPT_HASH` précédentes, toute réécriture
différente de ces migrations ou de toute autre migration publiée restent
refusées. Cette exception n'autorise ni `migration repair`, ni DDL manuelle, ni
`db push`, ni aucune écriture distante ; une seconde application gouvernée
devra être préparée après publication, vérification de `00027`, réconciliation
de l'historique et nouveau dry-run.

## Exception de réparation bornée — `20261012000022` et `20261013000007`

Lors de la première application contrôlée de la série de migrations d'octobre
2026, deux défauts SQL exécutables ont été constatés avant que la série ne soit
convergente : la clé étrangère `(participant_id, event_id)` de `00022` ne
disposait pas de clé unique référencée, et `00007` déclarait un `GRANT` avec une
signature de fonction incomplète. La correction a été vérifiée par le replay
réel du projet lié ; le même historique distant contient maintenant les
versions corrigées.

Cette exception est strictement limitée aux deux fichiers et à leurs empreintes
ci-dessous. Le garde de publication n'accepte ces réécritures que par hash
exact ; toute autre réécriture d'une migration publiée reste bloquée.

```text
20261012000022_BEFORE_HASH: a0fe697a92432e13e02ecfe6ebee10b609d92fec350bc115e090f10aee16db42
20261012000022_AFTER_HASH:  c272820f66ff466d42d9c4dab0fdad685b482f54927fe1df9927233d6e7e9cf4
20261013000007_BEFORE_HASH: c473128711ab5edf7c0eee826665c41cfb483c428bfe0916209507a8c24a8e80
20261013000007_AFTER_HASH:  f4ca930cce616753addfd047badb2b96448ad8aed665b92d68f44079fbe11f1d
```

La série a été appliquée avec `npx supabase db push --linked --yes`, sans
`migration repair`, DDL manuelle, reset ni écriture hors migration. La
réconciliation finale de l'historique local/distant et la vérification des
contraintes, fonctions et privilèges restent obligatoires.

## Exception syntaxique bornée — `20261101000008`

Une exception syntaxique strictement limitée est acceptée pour la migration
`20261101000008_public_impact_butt_mass_provenance.sql`. Le projet Supabase
canonique `trktzkgujgpgsgkoyndn`, vérifié avant publication de cette correction,
est enregistré jusqu'à `20261101000007` ; `20261101000008` et les versions
suivantes de cette série sont absentes de son historique distant. La migration
défectueuse n'a donc jamais été appliquée sur cette cible et peut être rendue
rejouable avant sa première application, sous réserve des contrôles et de la
réconciliation prévus par le présent ADR.

La cause est une erreur de portée SQL dans
`public.public_impact_butt_condition_projections`: les trois expressions de la
clause `VALUES` lisaient `explicit_counts` sans que ce CTE soit introduit dans
le `FROM` de cette expression. PostgreSQL rejetait la migration avec
`SQLSTATE 42P01`. La correction ajoute uniquement `FROM explicit_counts` et un
`CROSS JOIN LATERAL` sur les trois lignes d'état, puis expose les mêmes deux
colonnes. Les expressions, l'ordre des états, les conditions, les signatures
RPC, les grants, les verrous et les effets métier restent inchangés. La
correction ne traite pas le correctif forward-only du double comptage de
`load_public_landing_action_summary(date)`, qui reste porté par sa migration
additive dédiée.

Les empreintes SHA-256 UTF-8 du fichier complet sont :

```text
20261101000008_BEFORE_HASH: 0e2abd25c59534d9c2ba9ea727c5921d4a140fa638e1699ec2530a93eef9cfff
20261101000008_AFTER_HASH:  f1c80202cb180538c1b02f2cfd6307e188e1d66af77a324e7933f5fd102425ae
```

Le garde `npm run audit:supabase-migration-trees` n'autorise que cette
empreinte corrigée pour ce chemin, en plus des exceptions déjà documentées ;
toute autre réécriture reste refusée. Cette exception n'autorise ni
`migration repair`, ni DDL manuelle, ni reset, ni mutation hors des migrations
canoniques. Après publication du candidat, l'application doit exclusivement
suivre `migration list --linked`, `db push --dry-run`, puis
`db push --linked --yes` sur ce projet identifié. La preuve d'application et
les validations PostgreSQL de 0008, 0009 et des versions suivantes doivent
être rapportées séparément des contrôles statiques.

## Exception syntaxique bornée — `20261103000003`

Une exception strictement limitée est acceptée pour la migration
`20261103000003_territorial_legend_rewards.sql`. Une lecture seule de
`npx supabase migration list --linked`, effectuée avant ce lot sur le projet
Supabase canonique `trktzkgujgpgsgkoyndn`, montre que l'historique distant
s'arrête à `20261103000002` : `20261103000003` n'a jamais été enregistrée.
La définition publiée ne pouvait pas être rejouée car la table des détentions
déclarait deux fois `updated_at` et la table des preuves ne déclarait pas la
colonne utilisée par la RPC d'invalidation.

La réparation de `00003` est bornée à ces deux définitions de table. Elle ne
modifie ni les données, ni les RLS, ni les grants, ni les signatures ou la
sémantique métier des RPC. Le contrat JSON et le décodage des gagnants sont
portés séparément, en migration forward-only, par
`20261103000004_territorial_legend_rewards_contract.sql`.

Les empreintes SHA-256 UTF-8 du fichier complet sont conservées pour le garde
d'immutabilité :

```text
20261103000003_BEFORE_HASH: c69e9b3b6592fe3271ae5f297205fc675094f82385d5b1aeb33587620800709b
20261103000003_AFTER_HASH:  2d3659ad43e30688ad4e09a601e976bae9f6566dc02dc8aadfdbf72a17906192
```

Cette exception n'autorise ni `supabase migration repair`, ni DDL manuelle,
ni application distante implicite. La convergence doit être vérifiée par
`migration list --linked`, `db push --dry-run`, puis une preuve PostgreSQL
éphémère de reconstruction et de contrat RPC. Aucune mutation du projet lié
n'a été effectuée pour établir cette preuve.

## Exception syntaxique bornée — `20261109000007`

Le projet Supabase canonique `trktzkgujgpgsgkoyndn` est enregistré jusqu'à
`20261109000006`; la migration `20261109000007` n'est donc pas encore
appliquée sur cette cible. La première expression de sa détection de l'ancienne
contrainte quiz a été reproduite en lecture seule sur le schéma lié et échoue
avec `SQLSTATE 42883` : `information_schema.sql_identifier[]` ne peut pas
être comparé directement à `text[]`.

La correction est strictement syntaxique : `key_usage.column_name` est casté
en `text` avant `array_agg`. Elle ne modifie ni la contrainte recherchée, ni
les colonnes, les révisions de contrat, les preuves par division, les verrous,
les RLS, les grants ou les fonctions métier. Elle rend rejouable la première
migration absente sans autoriser `migration repair`, DDL manuelle ou mutation
distante implicite.

```text
20261109000007_BEFORE_HASH: dc6c2e33d0efd41e9f8ac6721323335299d2035506dca7485c9c2ab3a85a01c9
20261109000007_AFTER_HASH:  4c4c97b463e167e67cc0889d82fa00c9bba1e0a936db05e0e6b98f545e60f297
```

Après publication, l'application devra rester précédée de `migration list
--linked` et `db push --dry-run`, puis être explicitement autorisée. La preuve
PostgreSQL du contrat final, des fonctions et des Advisors reste distincte des
contrôles statiques et `DB_SEMANTICS_NOT_EXECUTED` tant qu'aucun replay sur une
base éphémère n'est disponible.

## Exception syntaxique bornée — replay territorial 00003–00007

Lors de la première application autorisée de la série territoriale sur le
projet Supabase lié, PostgreSQL a rejeté `20261103000003` avec `SQLSTATE 42601`
sur `FOREACH v_threshold IN array[...]`. La même syntaxe invalide était
présente dans les redéfinitions de la RPC des migrations `00004`, `00001` et
`00007`. La première transaction ayant échoué avant l'enregistrement de la
version, aucune de ces neuf migrations n'était appliquée sur la cible.

La correction remplace uniquement `IN array[...]` par `IN ARRAY ARRAY[...]`.
Elle ne modifie ni les signatures, les contrats JSON, les seuils, l'ordre, les
RLS, les grants, les verrous, ni la sémantique métier. Le garde de publication
autorise uniquement les empreintes corrigées ci-dessous, après cette preuve
réelle d'erreur et avant la première application de la série concernée.

```text
20261103000003_BEFORE_HASH: 2d3659ad43e30688ad4e09a601e976bae9f6566dc02dc8aadfdbf72a17906192
20261103000003_AFTER_HASH:  2ef23664006f25b7db0d2f5d2644e911d448e5a81db6dae982f02520c71916d6
20261103000004_BEFORE_HASH: e725e7b87a8af7c94928f78f00af364a3568dcdafe6c4a8bf2b54f0581f4d485
20261103000004_AFTER_HASH:  fffc07baed3480eacddd41309af6a9992040fa55734ff34e3f4f6e5555f5f4a1
20261104000001_BEFORE_HASH: 43323dff6ef780a05aa3665f06a3675661ee0168e7ebdad10e30f2a4489a665c
20261104000001_AFTER_HASH:  612a934ecf7c6c791cc6e8ba25c13d1ddd4674c4668f75ee60ec0990887d35da
20261104000007_BEFORE_HASH: 1765a328617c24bae0c335a6ff43f85e41e89137bb63bf8f28a847443977c5a9
20261104000007_AFTER_HASH:  91fdbcc048b60296fa32262543c5081e92d909d959ec40e481c059e839c9122d
```

La série a ensuite été appliquée par la CLI Supabase liée, sans Docker,
`migration repair`, DDL manuelle, reset ni écriture hors migrations. La
convergence de l'historique est prouvée séparément ; le pgTAP et les scénarios
RPC qui créent des données de test restent `DB_SEMANTICS_NOT_EXECUTED` tant
qu'une branche Supabase ou un environnement éphémère explicitement autorisé
n'est pas disponible.

## Évolution forward-only — `20261104000001`

La migration `20261104000001_territorial_legend_annual_campaigns.sql` porte
la décision produit des campagnes annuelles après `00003` et `00004`, sans
réécrire ces fichiers. Elle ajoute `campaign_year`, conserve sans les
réinterpréter les éventuelles lignes historiques dépourvues d'année, et
remplace la RPC de réconciliation par une version bornée au 1er janvier–31
décembre Europe/Paris. Les identités de conquête, longévité et fin de saison
incluent désormais l'année ; les seuils annuels sont 7, 30, 90 et 180 jours.
La migration ne fabrique aucun historique et ne modifie aucun environnement
lié pour obtenir une preuve.

## Opérations temporaires de benchmark

Une activation ou désactivation temporaire d'extension réalisée pour un
benchmark, un debug ou un bridge d'image distant ne constitue pas un état
durable du schéma canonique. Elle ne doit donc pas être ajoutée comme SQL
rejouable dans une migration applicative.

Les versions historiques `20260819142956`, `20260819143518`, `20260819154147`
et `20260825130153` sont conservées avec leurs noms et timestamps uniquement
pour aligner l'arbre local sur un historique Supabase déjà enregistré. Elles
restent volontairement des migrations no-op documentées : un `db reset` ou un
replay neuf ne doit ni installer ni supprimer `pg_net` ou `http` par leur
intermédiaire.

Toute opération de benchmark distante doit suivre sa propre procédure
ponctuelle, avec vérification de l'effet final et sans `DROP EXTENSION ...
CASCADE` dans le chemin canonique. Une extension ne doit être imposée par les
migrations que si elle appartient réellement au contrat durable de
l'application.

Le rollback du changement de dépôt consiste à restaurer le commit de ce lot.
Cela ne remplace pas une vérification de l'historique de migrations d'une base
distante avant déploiement.

## Exception de replay bornée — `20261105000015`

La migration `20261105000015_pedestrian_risk_projection_publication_revision.sql`
était publiée dans Git mais absente de l'historique du projet Supabase lié au
moment du lot. Son initialisation de séquence appelait `setval(..., 0, true)`
lorsque la table des versions était vide, ce qui bloque le replay PostgreSQL
avant l'installation du contrat de publication. La correction est limitée à
borner cette valeur à `1` ; une table non vide conserve son maximum et le
prochain `nextval` reste strictement supérieur à toute révision existante.

Cette exception pré-application ne constitue ni une réécriture d'une migration
déjà appliquée, ni une permission de `migration repair`, de DDL manuelle ou de
mutation distante. Le replay complet sur base vide et la mise à niveau depuis
un historique existant doivent être validés séparément dans la lane Supabase
éphémère ; ils restent `DB_SEMANTICS_NOT_EXECUTED` tant que cette lane n'est
pas opérationnelle.

```text
20261105000015_BEFORE_HASH: DD7675F2808232612BB84987145729D94BB44B31802E9C20DFE9DE233A9EDEB9
20261105000015_AFTER_HASH:  AF7E5DD0F3464DE70445CC30FE5CB55B04BCF3BCDEC7C16D861B5A6D257DA48A
```

## Interdiction

Ne pas maintenir indéfiniment deux copies manuelles sans contrôle de synchronisation.
