# AGENTS.md — CleanMyMap

## Portée et priorité

Ce fichier porte les **invariants universels d'exécution**. Les instructions
scoped complètent ces règles sans les affaiblir. Ne pas y recopier leurs
procédures spécialisées.

Priorité : demande explicite de l'utilisateur ; sécurité, données et intégrité ;
fichier explicitement fourni pour le lot ; checkout et contrats réellement
consommés ; `AGENTS.md` racine et scoped ; documentation canonique ; simplicité,
maintenabilité, performance et coûts.

**Canari** : commencer uniquement la réponse finale par `Maxence —`.

**Source versionnée** : `maxd4/CleanmyMap`, branche `main`. Dans le checkout,
identifier le dépôt par sa racine Git et son remote, jamais par le nom du dossier.
Le checkout local effectif, ses changements préexistants et les candidats
explicitement fournis doivent être distingués du `main` publié.

## Ambition et décision avant modification

Viser **le meilleur résultat démontrable**, pas simplement une exécution plus
rapide ni davantage de code. Pour un changement substantiel, vérifier le vrai
objectif, les hypothèses, les méthodes du domaine, les coûts, les risques et les
critères mesurables. Un objectif ambitieux reste une cible, jamais un gain acquis.
Si l'objectif est irréalisable ou contredit par le checkout, le signaler et
proposer une alternative étayée sans abaisser silencieusement l'acceptation.
Appliquer cette profondeur proportionnellement au risque ; ne pas transformer
une correction locale évidente en audit général.

Avant d'écrire : lire l'état courant de la zone, le `AGENTS.md` scoped, les
contrats, callers, consommateurs et tests pertinents. Pour un contrat métier,
cartographier les voies de mutation directes et indirectes (API, jobs, imports,
RPC, triggers), les acteurs et droits, les transitions, la persistance, les
scénarios normaux et interdits et les preuves nécessaires. Regrouper les
conséquences de même cause dans **un lot cohérent complet**, sans micro-lots ni
refonte voisine. Fixer sa `STOP CONDITION` avant l'intégration.

Pour une fonctionnalité nouvelle ou modification substantielle, décider avant
écriture entre **`EXTEND_EXISTING`**, **`CREATE_MODULE`** et
**`RESTRUCTURE_FIRST`** : identifier l'owner, ses responsabilités, la taille et
croissance attendues, les effets, états, dépendances, consommateurs et tests.
Relire après intégration les modules et fonctions concernés : une extraction
ne doit pas seulement déplacer un monolithe. Documenter brièvement cette
décision dans le bilan, sans créer de registre concurrent. Méthode et seuils :
`documentation/development/conventions-modularisation.md`.

**Preuves distinctes** : source présente ≠ test présent ≠ test exécuté ≠
comportement d'intégration observé ≠ état distant ≠ production. Les niveaux
`STATIC_CONTRACT`, `EXECUTED_BEHAVIOR` et `INTEGRATION_PROOF` sont définis dans
`documentation/development/TESTING.md`. Un mock, une assertion SQL textuelle ou
un `db push --dry-run` ne prouvent pas RLS, transactions, triggers ou concurrence.
Sans exécution PostgreSQL autorisée, indiquer `DB_SEMANTICS_NOT_EXECUTED`.

**Découverte facultative** : QMD ne remplace jamais les fichiers réels. Par
défaut, ne pas rafraîchir la collection CleanMyMap plus d'une fois par 24 h ;
réutiliser l'index plus récent. Passé ce délai, `qmd update -c CleanMyMap`
seulement si utile ; `qmd embed` seulement après mise à jour autorisée et pour
un besoin sémantique réel. Vérifier la fraîcheur et lire les sources avant toute
décision. GitNexus reste facultatif et soumis aux conditions documentées dans
`TESTING.md`.

## Modèle d’exécution

Le workflow courant est `MAIN-ONLY / MULTI-WRITER COORDONNÉ`.

Plusieurs writers Codex peuvent travailler dans le checkout canonique ; ils doivent ne jamais écraser silencieusement les changements d’un autre writer. Les
modifications sur des fichiers distincts peuvent progresser en parallèle ; un
même fichier, l’index, `HEAD` et les opérations Git mutantes doivent être
relus et coordonnés explicitement. Les fichiers scoped restent la source des
règles spécialisées de chaque sous-arbre.

main publié = référence versionnée ; une candidate locale explicitement
fournie ou produite pour le lot courant est autoritative pour ce lot jusqu’à
intégration ; tout changement local préexistant doit être préservé et ne doit
jamais être écrasé par une synchronisation avec Git.

- Travail normal sur `main` dans le checkout canonique. Plusieurs writers
  peuvent intervenir sur des chemins distincts. **Ne jamais créer** branche de
  chantier, clone, worktree, coordinateur ou claim persistant pour ce workflow.
- Un checkout dirty, des untracked, des commits locaux non publiés ou
  `HEAD != origin/main` **ne bloquent pas** l'analyse ni le travail indépendant.
  Cette présence ne constitue jamais un motif d'arrêt global.
  Ces exigences ne deviennent pas des préconditions de diagnostic local ; elles ne deviennent pas des préconditions de diagnostic local.
  Les exigences de candidat exact s'appliquent au contrôle et à la publication,
  pas comme préconditions d'un diagnostic.
- Capturer dès le départ l'état Git (dont chemins dirty/untracked), identifier
  les fichiers attribués au lot et figer son allowlist avant mutation. Les
  changements préexistants ou apparus en parallèle sont présumés étrangers
  tant que leur attribution n'est pas démontrée. **Ne pas** les modifier,
  restaurer, supprimer, stasher, déplacer, fusionner ou inclure implicitement.
  Un chemin ciblé dirty et étranger bloque seulement sa propre mutation.
- Les modifications indépendantes peuvent continuer ; coordonner explicitement
  toute écriture d'un chemin partagé, de l'index, de `HEAD` ou des refs Git.
  Une synchronisation de refs n'autorise jamais à écraser un fichier étranger.
- L'allowlist du lot gouverne le staging ; ne jamais utiliser `git add -A` par
  commodité. Vérifier `git diff --cached --name-only`, le diff staged et
l'ascendance non publiée avec `git log --oneline origin/main..HEAD`, y compris les commits d'autres writers. Un fichier
  apparu après capture de l'allowlist n'est pas inclus implicitement.
- Tous les fichiers modifiés ou créés **par le lot** et nécessaires à son
  contrat doivent être intégrés au commit validé ; ne laisser aucun changement
  du lot dirty/untracked. Les chemins étrangers restent intacts et sont signalés.

Hors mode de développement rapide : validation → commit isolé → push main →
vérification de convergence.

**Workflow normal** : validation → staging ciblé complet → commit isolé non
signé → push fast-forward sur `main` → fetch → vérification
`HEAD = origin/main`, ahead/behind `0/0`. Un lot antérieur non poussé n'interdit
pas de travailler ; il impose toutefois l'audit de l'ascendance avant
publication. Un `main` distant qui a avancé ou divergé bloque ce push :
refetcher pour caractériser, **ne pas** intégrer silencieusement, réconcilier
les fichiers étrangers ou forcer l'historique ; aucun `force-push`. Respecter tout blocage de garde,
d'attribution, de sécurité ou d'index avant commit/push.

Mode de développement rapide explicitement activé : commit local selon son
protocole, sans push tant que le mode reste actif.

**Mode de développement rapide**, uniquement sur activation explicite : commit
local isolé par lot selon `documentation/development/rapid-development-mode.md`,
sans push tant que le mode est actif. Une demande explicite de ne pas committer
ou pousser prévaut. Les mécanismes Git exacts, candidats `WORKTREE_LIVE`,
`STAGED`, `COMMITTED_SNAPSHOT`, `PUSH_CANDIDATE`, `DYNAMIC_CANDIDATE`, hooks
Les hooks `pre-commit` et `pre-push` et cas d'environnement sont définis dans
`scripts/AGENTS.md`,
`documentation/development/TESTING.md` et `host-environment.md`.

### Fichiers fournis et protection des modifications préexistantes

Un fichier fourni par l'utilisateur pour créer, remplacer ou adapter un chemin
est **la candidate autoritative de ce chemin pour le lot**. Conserver sa source
et la correspondance éventuelle nom joint → chemin cible. Ne jamais remplacer
cette candidate par `HEAD`, une ancienne conversation ou une autre version ;
ne jamais employer `restore`, `checkout`, `reset`, `clean`, `stash` ou une
régénération pour annuler son contenu. Lors d'une adaptation, préserver toute
partie non concernée ; lors d'un remplacement exact, vérifier l'identité du
contenu avant staging. Sa seule présence ne justifie pas un commit hors lot.

Avant toute écriture, identifier les changements préexistants du chemin ; en
cas d'attribution incertaine, arrêter **sa mutation**, sans interrompre les
analyses indépendantes. Avant commit, vérifier le diff, la préservation du
contenu fourni et l'absence de perte étrangère. En cas de doute, STOP.

## Qualité du changement et source canonique

Corriger la cause racine au plus petit périmètre **complet**. Chercher les
owners existants et les collisions sémantiques avant toute formule, statut,
score, seuil, constante métier, type public, table, RPC ou vocabulaire utilisateur.
Préférer : contrat actuel → extension cohésive → nouveau module justifié →
compatibilité bornée → exception locale indispensable. Une règle durable possède
un seul owner ; une façade de compatibilité ne devient pas une seconde vérité.

Exports privés par défaut. Un export, `index.ts`, barrel ou re-export exige un
consommateur actuel ou un contrat public/legacy vérifié. Migrer les consommateurs
avant de fermer un alias. Ne pas ajouter de service, dépendance, cache, table,
helper ou abstraction pour la seule commodité ou pour satisfaire un outil.

La taille seule ne justifie pas une extraction. Examiner responsabilités,
cohésion, effets et complexité **du module comme de ses fonctions**. Les seuils
et ratchets sont canoniques dans `conventions-modularisation.md` et `TESTING.md`.
Si un ratchet bloquant `FULL` ou un contrôle ciblé justifié impose une réparation,
réaliser une extraction **substantielle**, sans reformater, raccourcir les lignes,
déplacer intact un monolithe ou assouplir une baseline pour passer le seuil.
Sans frontière sûre, signaler le blocage.

### LEGACY / COMPATIBILITY

Les anciens noms, coordinateurs et métadonnées de migration décrivent
uniquement l’historique ; ils ne gouvernent aucun nouveau lot.

### Dead code, duplication et compatibilité

Avant suppression, inspecter usages statiques et dynamiques, tests, scripts,
contrats publics, connaissance métier, provenance, migrations et compatibilité.
Une absence d'import n'est **jamais** une preuve universelle de suppression.
Qualifier les capacités selon `CURRENT`, `IMPLEMENTED_NOT_EXPOSED`,
`COMPATIBILITY`, `TARGET`, `LEGACY` ou `DELETE_PROVEN` lorsque pertinent.

Pour les findings Knip, décider par finding : `DELETE_PROVEN`, `INTERNALIZE`,
`MIGRATE`, `RESTORE_FUNCTIONALITY` ou `KEEP_JUSTIFIED`. Une capacité métier utile
mais inaccessible ne doit pas être supprimée pour rendre Knip vert. Un
`KEEP_JUSTIFIED` durable doit être adossé à la baseline CURRENT, à l'ID stable,
à une preuve et à un SHA dans
`scripts/checks/dead-code-justifications.json`. Ne jamais masquer un finding
nouveau ou stale ; la cible d'un lot est zéro finding **non qualifié** dans son
périmètre, pas zéro finding global.

Pour jscpd, qualifier les familles de clones réelles : `MIGRATE_TO_CANONICAL`,
`CENTRALIZE_OWNER`, `DELETE_PROVEN`, `KEEP_INTENTIONAL`,
`TEST_SHARED_HARNESS` ou `NO_ACTION_NOISE`. Une ressemblance textuelle ne
suffit pas pour extraire. Les décisions durables de conservation/bruit exigent
les occurrences, la preuve et le SHA CURRENT dans
`scripts/checks/duplication-justifications.json`. Prioriser les défauts de
sécurité et de source de vérité avant les clones de tests et le bruit ; ne pas
truquer seuils, exclusions ou baselines. La procédure détaillée et les
critères de fraîcheur vivent dans `TESTING.md`.

**Mobile** : un lot dead-code/duplication non mobile ne modifie ni
`apps/mobile/**` ni les baselines, exclusions, justifications ou seuils pour
masquer des findings mobiles. Une correction mobile exige une demande explicite
sur ce périmètre et la lecture de `apps/mobile/AGENTS.md`.

Une dette adjacente n'entre dans le lot que si elle est directement utile,
sûre et vérifiable ; sinon, la classifier hors périmètre. Ne pas transformer
une amélioration Kaizen en chantier opportuniste.

## Sécurité, données et services externes

Invariants : ne jamais divulguer secret, token, cookie, session, credential,
PII ou stack trace sensible ; garder `service_role` côté serveur ; valider les
entrées et AuthN/AuthZ, ownership, scope et RLS à la frontière privilégiée.
Ne pas contourner une sécurité pour réparer un test ni transformer une donnée
calculée/proxy en mesure. Séparer intentions d'architecture, versionnement,
état distant et runtime observé. Les règles de droits communautaires ouvertes
sans pouvoir supplémentaire suivent `CHATGPT.md` et
`documentation/security/`.

**Migrations Supabase versionnées** : le workflow normal peut appliquer, sans
confirmation supplémentaire, une migration de
`apps/web/supabase/migrations/` **uniquement** si la cible liée est identifiée,
`npx supabase migration list --linked` a été comparé au dépôt,
`npx supabase db push --dry-run` donne la liste exacte, que les préconditions
SQL, l'historique, la sécurité et les contrôles avant/après sont établis, puis
que la convergence distante peut être vérifiée. Sinon STOP. Cette délégation
**n'autorise pas** `migration repair`, DDL manuelle, reset/seed destructif,
suppression de données, modification de secrets ou autre mutation distante.
Toute migration déjà appliquée se corrige par une migration forward-only.

Les dispositifs de *security deception* ou leurres actifs ne sont pas du
dead-code gratuit : exiger owner, aucune permission/secret réel, absence
d'effet métier, surveillance exploitable, tests positifs/négatifs et
contrat `CURRENT`. Détails, registre et commande de contrôle :
`documentation/security/SECURITY.md`.

## Documentation et validation

Une règle durable = une source canonique. Mettre à jour uniquement les documents
`CURRENT` affectés, avec la bonne distinction `CURRENT`, `PLAN`, `AUDIT`,
`HISTORY`, `SNAPSHOT`, `ADR`, `GENERATED`. Les documents fournis restent
protégés. Ne pas créer d'archive, fichier racine ou copie parallèle pour une
information déjà gouvernée. Les règles documentaires scoped, notamment les
zones protégées, sont dans `documentation/AGENTS.md`.

Prouver le résultat par les contrôles **proportionnés** : test ciblé, contrat
partagé, sécurité/régression si concernée, `checks:fast` seulement si le rayon
d'impact le justifie. Ne pas imposer automatiquement `quality:cycles`,
`quality:duplication`, `quality:complexity`, `quality:dead-code` ou
`quality:top-heavy` en `DEVELOPMENT`, même pour une extraction ; un contrôle
ciblé reste possible sur risque concret. Ces contrôles sont obligatoires dans
`FULL` sur le candidat exact.

Pour tout changement fonctionnel, Codex ajoute ou adapte les tests nécessaires
avant publication et respecte la politique canonique de couverture de
`documentation/development/testing-quality-coverage.md`.

### Tests massifs et couverture approfondie — obligatoire

Tous les lots Codex, y compris les corrections de bugs, refactorisations,
évolutions fonctionnelles, chantiers d'architecture et campagnes de qualité,
exigent une campagne de tests large sur l'intégralité du périmètre autorisé.
Quelques tests ciblés ne suffisent jamais à clôturer un lot.

**TESTS MASSIFS OBLIGATOIRES :** enrichir largement et méthodiquement les
suites de tests du périmètre traité. Explorer les branches et comportements
importants, ajouter de nombreuses régressions et vérifier les consommateurs
directs. Ne pas considérer quelques tests ciblés comme suffisants. Conserver
les contrats existants, mesurer les progrès et signaler explicitement toute
propriété importante non prouvée.

La campagne doit examiner les fonctions, services, routes, composants,
dépendances directes et consommateurs concernés, puis couvrir autant que le
risque l'exige les scénarios nominaux, limites, invalides, adversariaux,
erreurs, transitions d'état, concurrence, reprises et régressions historiques.
Les tests comportementaux et les preuves d'intégration, API, UI, PostgreSQL ou
E2E sont privilégiés lorsque les invariants ne sont pas prouvables par des
tests unitaires et que l'environnement autorisé est disponible. Pour chaque
invariant, établir une matrice propriétaire → tests existants → lacunes →
nouvelles preuves, et mesurer les quatre métriques de couverture avant/après
lorsqu'elles sont comparables.

Cette exigence ne justifie jamais une règle métier modifiée, un seuil abaissé,
une métrique manipulée, un test artificiel ou une extension hors périmètre.
Les tests restent déterministes, maintenables et proportionnés au risque ; les
propriétés importantes non prouvées restent explicitement signalées.

`npm run checks:full` / `FULL` **uniquement** sur demande explicite dédiée ou
préparation immédiate, explicitement demandée, d'un déploiement Vercel. Ne
jamais en faire la STOP CONDITION d'un lot ordinaire ; hors de ces cas, renvoyer
`NOT_RUN_POLICY`. Une fois `FULL` explicitement lancé, réparer **toute erreur
actionnable** du contrôle dans la même exécution, même préexistante ; un blocage
externe prouvé reste `BLOCKED_*`, jamais un faux succès. `RELEASE` exige la
preuve FULL du SHA concerné ; ce n'est pas un déploiement.

`precommit:guard` échoué bloque commit/push : diagnostiquer et réparer dans le
même lot si autorisé, puis relancer ; sinon signaler le blocage sans contourner.
Les hooks s'appliquent au candidat exact selon `scripts/AGENTS.md`.

En cas de correction de régression, erreur de revue ou reprise d'un lot déclaré
terminé à tort, appliquer dans **le même lot** la prévention proportionnée des
récidives de `documentation/development/repo-quality-rules.md` ; pas d'audit
global automatique. Ne pas utiliser tests, baseline ou suppressions de contrôle
pour masquer une anomalie. Ne jamais déclarer passé un test non exécuté.

Après publication, vérifier l'objectif et classer : régression introduite,
défaut préexistant critique, amélioration hors périmètre, hypothèse non
démontrée. Corriger seulement une violation actuelle pertinente ou un risque
critique prouvé. Regrouper par cause, respecter la `STOP CONDITION`, ne pas
prolonger un chantier pour une dette périphérique. Une preuve manquante est une
limite, pas automatiquement un bug.

## Routage scoped

| Domaine | Source |
|---|---|
| Web, Next.js, UI | `apps/web/AGENTS.md` |
| API | `apps/web/src/app/api/AGENTS.md` |
| Supabase, migrations | `apps/web/supabase/AGENTS.md` |
| Scripts web | `apps/web/scripts/AGENTS.md` |
| Scripts, Git, hooks, ratchets | `scripts/AGENTS.md` |
| GitHub Actions | `.github/AGENTS.md` |
| Mobile | `apps/mobile/AGENTS.md` |
| Python | `maintenance/python/AGENTS.md` |
| Documentation | `documentation/AGENTS.md` |
| E2E | `e2e/AGENTS.md` |
| Tests et niveaux de preuve | `documentation/development/TESTING.md` |
| Architecture modulaire | `documentation/development/conventions-modularisation.md` |
| Qualité et prévention | `documentation/development/repo-quality-rules.md` |
| Environnement et verrous Git | `documentation/development/host-environment.md` |
| Sécurité | `documentation/security/` |

Ne lire que les sources spécialisées pertinentes. Les anciens noms, worktrees,
claims et coordinateurs sont `LEGACY` ou `COMPATIBILITY`, jamais un workflow
`CURRENT`.

## Clôture et réponse

Clôturer lorsqu'objectif, invariants et preuves suffisantes sont traités et
qu'aucun changement étranger n'a été écrasé. Signaler les incertitudes
matérielles, blocages et écarts, sans rapport encyclopédique. Réponse finale
en français, commençant par `Maxence —`, avec résultat, commit éventuel et
validation importante seulement si elle éclaire la décision.
