# Testing Guide

Guide canonique de validation du dépôt CleanMyMap.

## Principe

Une commande ne doit jamais être présentée comme « globale » si elle ne couvre qu'une partie du dépôt.

Le workflow CleanMyMap distingue trois modes de validation : `DEVELOPMENT`,
`FULL` et `RELEASE`. Les tests spécialisés restent des briques appelables
séparément, pas des modes supplémentaires.

## Exécution non bloquante du checkout

Les analyses et validations locales peuvent toujours démarrer et se poursuivre
dans un checkout staged, unstaged, untracked, avec des commits locaux non
publiés, `HEAD != origin/main` ou un autre writer actif. Aucun worktree propre,
SHA figé, gel des writers ou convergence Git n'est un prérequis de
`DEVELOPMENT`, d'un diagnostic ciblé ou d'une validation indépendante. Le
runner capture l'état Git initial et les chemins du lot, préserve les chemins
étrangers et poursuit les opérations non conflictuelles. Une évolution de
`HEAD`, de `origin/main`, de l'index ou du worktree requalifie et rejoue
uniquement la preuve devenue incohérente ; un chemin ciblé dirty d'un autre
writer bloque sa mutation, pas le reste du lot.

Les provenances sont distinctes et doivent être affichées : `WORKTREE_LIVE`
pour le checkout mouvant, `STAGED` pour l'index exact, `COMMITTED_SNAPSHOT`
pour un arbre Git immuable identifié par SHA, et `PUSH_CANDIDATE` pour les refs
réellement transmises au push. Une mesure `WORKTREE_LIVE` est informative si
le checkout évolue et ne constitue jamais une preuve reproductible d'un SHA.
Les exigences de candidat exact pour `FULL`, SonarQube, les releases et le push
restent obligatoires au moment de leur opération ; elles ne bloquent pas les
diagnostics locaux.

## Niveau de preuve et contrats exécutés

Toujours distinguer :

```text
présence textuelle
≠ structure statique
≠ comportement exécuté
≠ propriété métier démontrée
```

Un test qui lit une migration SQL et vérifie des chaînes, des noms ou des
regex est un `STATIC_CONTRACT`. Il peut protéger la présence de RLS, grants,
revokes, fonctions, `search_path` ou clauses obligatoires, mais ne prouve pas
l'idempotence, l'atomicité, les contraintes à l'exécution, les effets de
triggers, les interactions RLS, la concurrence ou le résultat d'une RPC.

Les niveaux de preuve sont distincts et ne doivent pas être interchangeables :

- `STATIC_CONTRACT` vérifie la source, la structure ou la configuration sans
  exécuter la frontière concernée ;
- `EXECUTED_BEHAVIOR` exécute le code applicatif et observe son comportement
  dans le harness correspondant ;
- `INTEGRATION_PROOF` exécute réellement une frontière externe ou persistante
  (par exemple PostgreSQL, Supabase, Storage ou HTTP) et en observe le résultat.

Un `EXECUTED_DB_CONTRACT` est une forme spécialisée d'`INTEGRATION_PROOF`.
Ainsi, `STATIC_CONTRACT` ≠ `EXECUTED_BEHAVIOR` ≠ `INTEGRATION_PROOF`.

Un `EXECUTED_DB_CONTRACT` exécute réellement le contrat dans l'environnement
de validation supporté et doit être nommé comme tel dans le compte rendu. Si
cette exécution n'est pas disponible dans le lot, rapporter
`DB_SEMANTICS_NOT_EXECUTED`; ne jamais présenter le test statique comme une
preuve équivalente.

Pour un lot touchant un invariant transactionnel ou RLS, la preuve est planifiée
**avant le premier prompt** : scénarios positifs et négatifs, permissions,
reprise, conflits et concurrence pertinents. Préférer l'environnement PostgreSQL
éphémère déjà autorisé par les workflows du dépôt lorsqu'il peut réellement
exécuter ces scénarios, en vérifiant ses déclencheurs et secrets requis.
La présence d'un workflow, sa configuration ou un `db push --dry-run` ne prouve
pas l'exécution de ces scénarios sur le SHA candidat. En cas d'indisponibilité,
conserver `DB_SEMANTICS_NOT_EXECUTED` et traiter explicitement la limite de
preuve dans la décision de clôture, sans déployer ni appliquer une migration
distante implicitement.

La preuve PostgreSQL des contrats SQL existants est produite uniquement par la
lane Supabase éphémère hébergée `.github/workflows/e2e-supabase.yml`, après
rejeu des migrations canoniques et du seed. Le runner
`scripts/ci/run-supabase-sql-proof.mjs` inventorie et trace séparément les
fichiers pgTAP, les scripts SQL contractuels et les scénarios multi-sessions
existants. Il exige un plan pgTAP complet ou un marqueur de fin contractuel ;
un fichier présent, une commande interrompue, une sortie incomplète ou une
preuve d'un autre SHA ne produit jamais `INTEGRATION_PROOF`.

Le rapport porte le SHA exact du checkout CI et distingue
`INTEGRATION_PROOF` (exécution PostgreSQL observée), `NOT_RUN` (preuve non
atteinte ou volontairement non déclenchée) et `DB_SEMANTICS_NOT_EXECUTED`
(protocole absent ou environnement incapable d'exécuter la sémantique DB).
Une nouvelle extension `.sql` non enregistrée fait échouer le runner plutôt
que de devenir silencieusement une preuve. Les contrats non pgTAP ne sont pas
convertis en pgTAP : chacun conserve son protocole, et les scénarios de
concurrence restent exécutés par leurs scripts multi-sessions existants.

## Gouvernance des preuves pour les changements sensibles

Avant toute modification substantielle ou sensible, le lot doit identifier
les contrats métier et techniques effectivement touchés, distinguer les
exigences issues des sources canoniques des comportements seulement déduits
du code, puis prévoir des scénarios positifs, négatifs et de limite adaptés à
ces contrats. Un test structurel, mocké ou textuel peut protéger une
propriété de source ; il ne devient pas une preuve d'AuthZ, de RLS, de
transaction, de concurrence ou de service externe exécuté.

Le résultat doit séparer explicitement :

- l'absence de preuve (`NOT_RUN`, `NOT_MEASURED` ou un `BLOCKED_*` explicite) ;
- l'échec d'une preuve (`FAIL`) ;
- le comportement effectivement validé (`PASS` avec sa provenance).

Une preuve d'un autre SHA, une validation périmée ou une erreur qualifiée
`PREEXISTING_PARALLEL_FAILURE` reste visible et ne peut jamais produire un
`PASS` de livraison. Les exigences et tests canoniques ne doivent pas être
réécrits pour ratifier implicitement l'implémentation candidate ; une
évolution légitime du contrat doit être documentée et accompagnée de la
preuve correspondante dans son owner canonique.

## Seuils et qualité des assertions

Un test doit protéger un invariant identifiable et non reproduire la structure
actuelle de l'implémentation. Rechercher l'élément par son ID, sa clé ou son
prédicat métier ; `items[0]` ou `items[1]` n'est acceptable que lorsque l'ordre
fait partie du contrat testé.

Pour une règle à seuil, couvrir lorsque pertinent : juste sous le seuil,
exactement au seuil, juste au-dessus, absence ou valeur nulle, et interaction
avec le niveau de seuil supérieur. Une assertion doit nommer ou vérifier la
frontière qu'elle protège ; ajouter un second test avec les mêmes entrées et
les mêmes assertions n'est pas une nouvelle preuve. Il doit couvrir une autre
frontière, un autre contrat public ou être consolidé.

## Artefacts de validation

Les sorties locales et les candidates de contrôle ne sont pas des sources
documentaires :

- `artifacts/` contient les sorties générées ou régénérables ;
- `.artifacts/validation/prepush-candidate/<sha>/` contient les candidates
  temporaires matérialisées pour la validation dynamique et doit être nettoyé
  par son owner ;
- les audits durables sont conservés sous `documentation/`, dans le domaine
  concerné, et non dans `.artifacts/`.

Ne jamais versionner une preuve dans `.artifacts/` par commodité. Vérifier sa
provenance, sa reproductibilité et son emplacement documentaire avant de la
conserver.

Les anciens lanceurs Windows peuvent être conservés localement sous
`.local/root-wrappers/`. Ce dossier est ignoré et n'est pas une surface
versionnée ; les commandes du workspace mobile restent la référence
reproductible.

Pour un nettoyage local ponctuel, utiliser `npm run clean:temp`. La variante
`clean:temp:force` exige que les outils du dépôt soient fermés ; `npm run
dev:clean` combine le nettoyage et le redémarrage du développement.

## Guide modulaire

Les contrats communs et les niveaux de preuve restent dans ce fichier. Les procédures spécialisées sont réparties selon leur responsabilité :

- [Exécution et CI](./testing-execution.md) — installation, modes `DEVELOPMENT`/`FULL`/`RELEASE`, sécurité CI, triage et commandes ciblées ;
- [Qualité et audits](./testing-quality.md) — couverture, croissance, complexité, dead code, mutation, duplication, cycles et Quality Audit ;
- [Surfaces et intégration](./testing-platforms.md) — regression gates, E2E, TypeScript, build, mobile, QA UI, smoke, Clerk et protocole manuel Actions.

Chaque module conserve les contrats spécialisés et doit être lu avec les règles scoped applicables.
