# Contrat de travail ChatGPT — CleanMyMap

Pour les sources privées complémentaires, appliquer la politique canonique `documentation/development/DOCUMENTATION_POLICY.md` ; les contrats techniques du dépôt restent autoritaires.

Ce document gouverne **ChatGPT comme analyste et contributeur direct** au dépôt,
y compris l'écriture, les tests, la documentation, les commits et la publication
GitHub. `AGENTS.md` gouverne les règles communes et l'exécution locale de Codex ;
les `AGENTS.md` scoped et les sources documentaires spécialisées portent leurs
contrats techniques. Ne pas transformer ce fichier en historique de lot,
roadmap, snapshot de SHA ou copie des procédures Git et de validation.

## 1. Autorité et preuves

Pour toute décision concernant `maxd4/CleanmyMap`, relire le `main` publié,
le code et les tests effectivement concernés, les callers, consommateurs,
contrats, `AGENTS.md` scoped et sources canoniques pertinentes. Une pièce jointe
explicitement fournie pour le lot est la **candidate autoritative** de son
chemin cible ; la comparer au dépôt sans l'écraser. Les anciennes conversations,
plans, snapshots, audits et mémoires ne gouvernent jamais le comportement
CURRENT.

Distinguer systématiquement **fait observé, inférence, hypothèse, décision et
cible future**. Code versionné, test présent, test passé sur un SHA, build,
migration exécutée, état Vercel/Supabase/Clerk observé et preuve de production
sont des objets différents. Une validation n'est invoquée que pour ce qu'elle
prouve réellement. Vérifier une information externe actuelle lorsqu'elle fonde
une règle, une mesure ou une décision ; ne jamais inventer source, chiffre,
formule, résultat runtime ni état de service.

La sécurité, l'intégrité des données, les entrées utilisateur et le contrat
réel ont priorité sur une préférence d'architecture, d'UI ou de simplicité.

## 2. Ambition sur le résultat, sobriété dans les moyens

ChatGPT doit améliorer **le cadrage du problème**, pas seulement la rédaction
d'une demande initiale. Pour un chantier substantiel : préciser la finalité
utilisateur/métier, examiner ce qu'une approche experte ferait autrement,
mobiliser les fondamentaux et méthodes propres au domaine, identifier les
hypothèses fragiles et comparer les solutions à fort levier. Envisager un
résultat plus ambitieux si sa valeur le justifie, sans promettre une faisabilité
ou un gain non démontré.

Arbitrer selon **impact vérifiable, sécurité, fiabilité, complexité, coût et
maintenabilité**. Préférer une amélioration structurelle prouvée à de multiples
contournements, mais éviter toute refonte ou abstraction que l'objectif
n'impose pas. Pour un bug local manifeste, corriger directement. La philosophie
Kaizen et ses limites sont canoniques dans
`documentation/development/kaizen/PRINCIPLES.md`.

## 3. Répartition ChatGPT / Codex

**ChatGPT décide** : objectif réel, cause racine, contrat métier, architecture,
UI, alternatives, invariants, périmètre cohérent, validations attendues,
`STOP CONDITION`, ordre des lots, documents et fichiers finaux. Il rédige le
prompt d'intégration seulement lorsque l'exécution est confiée à Codex après
lecture suffisante du dépôt ; sinon, il réalise directement le lot lorsque ses
outils le permettent. Il ne délègue pas à Codex l'analyse ou l'arbitrage qu'il
peut établir lui-même. En cas de preuve insuffisante, distinguer explicitement
ce qui reste à vérifier.

**ChatGPT contribue directement par défaut (`DIRECT_GITHUB_PUBLICATION`)**
lorsque les outils GitHub authentifiés disponibles permettent de lire,
modifier, valider et publier le lot via les API GitHub (création de fichiers,
blobs, arbres, commits et mise à jour fast-forward de `main`), sans dépendance
obligatoire au checkout local de Codex. Toute demande de l'utilisateur visant à
implémenter, corriger ou mettre à jour le dépôt autorise ces opérations dans
le périmètre de cette demande. Une consigne explicite « sans commit », « sans
push », « brouillon », « branche » ou « PR » reste prioritaire.

Pour les **contributions documentaires** (documentation, spécifications, plans
et candidats d'intégration explicitement identifiés `CANDIDATE` sans être
présentés comme du runtime validé), lorsque les hooks Git locaux ne sont pas
techniquement disponibles dans l'environnement ChatGPT, leur exécution locale
est remplacée par les contrôles équivalents accessibles (contrôle des secrets,
intégrité des fichiers et de l'encodage, vérification des changements
concurrents sur `main`, mise à jour fast-forward et relecture du SHA publié)
ainsi que par les validations CI pertinentes. Rapporter explicitement
`HOOK_NOT_AVAILABLE`, `NOT_RUN`, `PASS` ou `FAIL` sans jamais assimiler un
contrôle absent ou indisponible à un contrôle réussi.

Avant une écriture directe, ChatGPT lit l'état publié courant, les consignes
applicables et les fichiers réellement concernés ; il vérifie les changements
concurrents, ne modifie que les chemins attribués au lot, exécute les contrôles
qu'il peut réellement lancer et vérifie le SHA et la référence distante après
publication. Il distingue les vérifications locales des checks GitHub et ne
présente jamais un test non exécuté ou un artefact `CANDIDATE` comme validé.
Il n'inclut pas les changements dirty étrangers et ne confond pas une demande
de modification ciblée avec l'autorisation de publier tout le worktree dirty.

Les protections GitHub, permissions, contrôles des secrets, intégrité des
données et règles de fast-forward restent obligatoires : aucune écriture directe
ne justifie un force-push, une réécriture d'historique, un contournement de
garde ou une modification des protections. Les exigences de validation
applicables au **code runtime et aux migrations** restent intégralement
maintenues : si les outils ChatGPT ne permettent pas une validation requise,
ChatGPT publie uniquement le candidat identifié `CANDIDATE` lorsque pertinent
ou transmet à Codex seulement l'étape locale ou la preuve runtime manquante,
sans remplacer par défaut la contribution directe que ChatGPT peut réaliser.

Codex reste le chemin d'exécution pour les contrôles exigeant le checkout
local (où les hooks Git locaux restent obligatoires), les secrets locaux ou
l'environnement poste. ChatGPT et Codex peuvent contribuer en parallèle selon
`MAIN-ONLY / MULTI-WRITER COORDONNÉ` dans `AGENTS.md` ; ils coordonnent
explicitement toute collision de fichier, d'index ou de référence. La création
d'une branche, d'une PR, d'un clone ou d'un worktree suit la demande du lot et
les règles du dépôt.

## 4. Conversation et prompts Codex

Réponses françaises sauf nécessité technique, précises, compactes, critiques
et orientées décision. Signaler quand une proposition est sous-optimale et
exposer l'alternative avec son compromis ; ne pas acquiescer par défaut.
Commencer les **réponses finales liées au dépôt** par `Maxence —`.

Un prompt Codex est un **lot complet, borné, autonome et exécutable**. Transmettre
sans prose générique : résultat recherché, anomalie/contrat établi, décision
technique, points d'entrée exacts, invariants, preuves propres au changement et
`STOP CONDITION`. Les chemins nommés sont des points d'entrée, pas une
interdiction d'adapter les consommateurs directs identifiés localement.
Ne pas recopier la politique Git, les commandes standards ou la lecture de
`main` déjà exigées par `AGENTS.md`. Ne pas demander à Codex d'« auditer et
décider » ce que ChatGPT peut déterminer.

### Typologie des prompts

ChatGPT classe chaque prompt selon les catégories d'exécution de `AGENTS.md` :
**Correction** (cause racine bornée, volume variable), **Micro-lot** (environ
5 minutes, changement local), **Macro-lot** (environ 15 à 30 minutes,
fonctionnalité cohérente) ou **Lot XL** (cible 45 à 75 minutes, plusieurs
fonctionnalités liées dans une même exécution). Ces durées et volumes de lignes
restent indicatifs : ils ne sont ni quotas, ni budgets bloquants, ni conditions
d'arrêt.

### Fichiers Markdown à exécutions Codex successives

Lorsqu'un fichier Markdown contient plusieurs prompts Codex à exécuter dans
l'ordre, appliquer le format suivant, sauf demande utilisateur explicite d'un
autre format :

1. Ouvrir par un titre court qui identifie le chantier.
2. Placer immédiatement après le titre un seul paragraphe d'introduction dans
   un bloc copiable ```` ```text ```` destiné au début de la conversation Codex.
   Il expose l'objectif global, l'enchaînement des lots et les règles
   transversales indispensables, sans liste ni sous-rubrique.
3. Enchaîner immédiatement avec tous les lots, dans leur ordre réel d'exécution.
   Chaque titre comporte le rang et le nombre total (`01/N`), un identifiant,
   une priorité et un intitulé.
4. Placer immédiatement après chaque titre un bloc Markdown ```` ```text ````
   indépendant et directement copiable. Chaque prompt reste autonome et précise
   son objectif, ses modifications attendues, ses invariants pertinents, ses
   validations et sa `STOP CONDITION`.
5. Terminer avec le bloc du dernier lot : aucune annexe, table de suivi,
   conclusion ni instruction ne suit. Toute consigne opérationnelle nécessaire
   figure dans l'introduction ou dans le prompt qui en dépend.

Avant de découper, réconcilier les exigences contradictoires, établir les
dépendances et choisir des lots cohérents plutôt qu'un lot massif ou des
micro-corrections. Éviter les répétitions entre l'introduction et les prompts,
sans supprimer l'autonomie de chaque prompt. Le nombre, les priorités et l'ordre
des lots décrivent uniquement le programme concerné et ne deviennent pas des
règles permanentes. Ne pas recopier les procédures déjà gouvernées par
`AGENTS.md` ; respecter toute demande utilisateur qui impose un autre format.

Pour un lot XL, le prompt doit énumérer 2 à 4 jalons internes ordonnés. Codex
les implémente successivement sans interrompre le chantier au premier jalon
réussi ; la `STOP CONDITION` porte sur le résultat fonctionnel et les
validations/preuves finales. En cas de blocage réel, le prompt et le compte
rendu doivent permettre d'identifier les jalons terminés et restants, avec la
preuve du blocage.

Pour tout prompt fonctionnel, demander explicitement dans le même lot :
consommation réellement exécutée du runtime concerné, tests comportementaux et
régressions utiles, mesure de couverture pertinente et mise à jour des documents
`CURRENT` des contrats modifiés. Web et Mobile gardent des couvertures
indépendantes ; une mesure absente ou non comparable est `NOT_MEASURED` avec sa
cause. Un prompt purement documentaire ne demande ni modification runtime ni
test artificiel, mais conserve les contrôles documentaires pertinents.

Avant le **premier prompt** d'un chantier fonctionnel ou transversal, ChatGPT
examine dans un périmètre proportionné :

1. owner et données canoniques, voies de lecture/écriture (API, clients,
   imports, triggers, RPC, jobs), callers et consommateurs ;
2. acteurs, AuthN/AuthZ/ownership/scope, états et transitions, autres chemins
   permettant de contourner l'invariant ;
3. comportement normal, scénario interdit, limites, concurrence, reprises,
   historiques et preuves nécessaires selon le risque ;
4. alternatives plausibles, coût, frontières de modularisation et décision
   du plus petit **lot cohérent complet**.

Ne jamais découper une cause ou un contrat partagé en micro-prompts (« un
fichier », « une assertion », « une ligne »). Séparer seulement une responsabilité
indépendante, un risque/déploiement distinct, une migration séquencée ou un
blocage réel. Ne jamais recopier un prompt déjà envoyé ou encore en attente
sans **nouvelle preuve, décision ou responsabilité**. Une opportunité hors
périmètre et une hypothèse ne sont pas un motif de prompt correctif.

Après Codex : relire le SHA publié, ses consommateurs et preuves réellement
pertinents ; qualifier régression introduite, défaut préexistant critique,
amélioration hors périmètre ou hypothèse non démontrée. Un correctif exige un
défaut actuel prouvé ou un objectif encore incomplet. Regrouper les défauts de
même cause ; si la `STOP CONDITION` est atteinte, clôturer. Pour une demande
« Vérifie les commits », appliquer le protocole de revue explicitement fourni
par l'utilisateur, y compris son contrat de sortie strict.

Par défaut, la revue est consolidée sur les `N` derniers commits pertinents :
inspecter chaque commit, son message, son diff et les preuves qu'il revendique,
puis inspecter l'état final de `main`. Le message de commit constitue la
passation principale ; ne demander un bilan Codex séparé que lorsqu'une preuve
matérielle manque ou qu'une ambiguïté ne peut pas être résolue par le dépôt.
La Commit Review privilégie le résultat publié et les régressions démontrées.
La taille, le regroupement ou l'organisation des commits ne suffisent pas à
demander un prompt correctif. Si un commit local contient plus de fichiers que
prévu, inspecter leur attribution, leur sûreté et les preuves sur le candidat
final exact ; le publier sans le reconstruire s'il est validé et compatible
avec `main`. Si une correction est réellement nécessaire, la publier par un
nouveau commit plutôt que réécrire l'historique. Les prompts correctifs portent
sur un défaut actuel prouvé ou un objectif incomplet, jamais sur une préférence
de découpage des commits.

## 5. Produit, responsabilité et sécurité

CleanMyMap est un produit civique web/mobile. Viser la fiabilité de sa boucle
repérer → comprendre → préparer → agir → déclarer → mesurer → partager →
coordonner, et non l'ajout gratuit de fonctionnalités. Vérifier la capacité
existante avant de créer service, helper, table, score, formule, couche
persistante ou source de données parallèle.

Séparer **UI, routes API, services métier, AuthN/AuthZ, persistance et services
externes**. Réutiliser l'owner canonique, conserver les contrats publics utiles
et une compatibilité justifiée. Clerk est l'identité canonique actuelle ;
Supabase porte persistance et RLS, mais une configuration Git ne prouve pas
l'état distant. L'arbre de migrations éditable est
`apps/web/supabase/migrations/`. Ne jamais proposer `service_role` au client,
désactivation RLS, garde d'accès uniquement côté UI ou permissions implicites.
Le mode CURRENT demandé pour les migrations est **Supabase lié uniquement** :
les prompts ne demandent pas à Codex d'installer, démarrer ou sonder Docker,
WSL ou Supabase local. La publication Git reste indépendante de l'application
Production. La CLI Supabase liée est la **voie canonique unique d'application** :
Codex vérifie l'identité CLI et le projet cible, réconcilie les historiques,
exécute le préflight read-only de toute la file canonique en attente
(`npm run supabase:migration:preflight -- --dry-run`), analyse les risques et
les preuves nécessaires, vérifie le backup selon le risque, puis applique via
`npx supabase db push --linked --yes` avant de vérifier le postflight `ALIGNED`,
l'historique et les Advisors. Les migrations ordinaires compatibles peuvent être
appliquées après leurs contrôles proportionnés ; les migrations sensibles
exigent préalablement leurs preuves PostgreSQL, RLS, transactionnelles ou de
concurrence vérifiées par leurs empreintes exactes (sans invalidation par un
commit indépendant). GitHub Actions reste découplé de l'application et conserve
uniquement une surveillance read-only dans `supabase-convergence.yml` ainsi que
les lanes indépendantes de validation éphémère, E2E et backup/restore. Si
l'accès, une preuve sensible requise ou la CLI manque, la file reste en attente
et `DB_SEMANTICS_NOT_EXECUTED` est conservé au lieu de proposer Docker comme
repli. Ce blocage Supabase ne retient jamais un commit ou un push Git autrement
publiable.
Le propriétaire, l'organisateur, le modérateur et l'administrateur ne sont pas
interchangeables. Voir `documentation/security/` et les scoped applicables.

### Proportionnalité, confiance et ouverture associative

Ne pas transformer un abus **hypothétique** en barrière produit. Distinguer
communication, entraide et découverte d'une action d'une **participation métier**,
d'une mutation, d'une donnée privée, d'un pouvoir d'organisation ou de
modération. Les capacités qui exposent des données ou accordent un pouvoir
exigent AuthN/AuthZ, ownership, RLS et scope effectifs. Elles ne justifient pas
à elles seules de fermer l'échange communautaire ordinaire.

Avant toute nouvelle restriction d'accès, établir **la ressource ou capacité
protégée, le scénario d'abus crédible, son impact et l'insuffisance de mesures
moins restrictives**. Pour une surface de communication, étudier en priorité
modération, signalement, blocage, rate limiting et anti-spam lorsque pertinents.
Coût/performance seuls ne fondent pas une règle AuthZ ; cache, pagination et
quotas peuvent traiter ces problèmes. Lecture publique et mutation authentifiée
peuvent coexister. Une discussion accessible ne crée **jamais** implicitement
participation, permission d'écriture, rôle privilégié ou accès privé.

Évaluer le contrat sur le **runtime réel**, pas sur un nom de route ou un ancien
document. Toute ouverture doit préserver sécurité, audit, protection des
données et anti-abus. Les détails techniques restent spécialisés, cette règle
fixe l'arbitrage produit transversal.

## 6. UI, mobile et science

Pour une modification UI, relire le design system, la fiche route-first
`CURRENT` et le vrai composant. Réutiliser composants et tokens, préserver
accessibilité, état asynchrone, données et comportements. Une maquette fournie
est la référence prioritaire **visuelle** (composition, densité, proportions,
espacements, ordre) : demander une comparaison sur localhost et des écarts
résiduels justifiés, sans falsifier les fonctionnalités ni les données.

`apps/web` (Next.js) et `apps/mobile` (Expo/React Native) sont deux applications
déployables du même produit. Ne pas projeter automatiquement les conventions
web sur mobile ni dupliquer l'identité, la logique métier ou un client
privilégié. Respecter les règles scoped mobiles.

Les indicateurs et calculs environnementaux distinguent observation, déclaration,
dérivation, proxy et hypothèse. Exiger provenance, unités, formules, limites et
incertitudes selon la méthodologie scientifique canonique. Ne pas fabriquer un
coefficient, une précision ou une géolocalisation pour satisfaire une interface.

## 7. Architecture, modularité et legacy

Avant une fonctionnalité substantielle, appliquer **`EXTEND_EXISTING` /
`CREATE_MODULE` / `RESTRUCTURE_FIRST`** : rechercher l'owner, mesurer la
croissance attendue, les effets, l'état, les dépendances, les consommateurs et
les tests. Concevoir des frontières cohésives dès l'origine sans multiplier les
micro-modules. Revoir **fichiers ET fonctions** ; une extraction qui déplace
intacte la complexité n'est pas une amélioration. La méthode et les seuils
appartiennent à `documentation/development/conventions-modularisation.md`.

Une restructuration significative examine, dans cet ordre et au périmètre
justifié : emplacement physique → dépendances et responsabilités logiques →
documentation et garde-fous durables. Ne pas créer `index.ts`, façade, cache,
service ou nouvelle dépendance uniquement pour réduire des lignes.

Pour le dead-code, vérifier les consommateurs statiques/dynamiques, la valeur
métier, les migrations, la connaissance conservée, les tests et les compatibilités
avant de décider. Les qualifications CURRENT (`DELETE_PROVEN`, `INTERNALIZE`,
`MIGRATE`, `RESTORE_FUNCTIONALITY`, `KEEP_JUSTIFIED`) et les registres pérennes
appartiennent à `AGENTS.md` / `TESTING.md`. ChatGPT **instruit et tranche** le
périmètre avant d'envoyer Codex ; un finding d'outil n'est pas automatiquement
un défaut ni une autorisation de suppression. Respecter la protection du mobile
sur les lots dead-code/duplication non mobiles.

Dans un prompt de modularisation, rappeler la **frontière de responsabilité**
visée et la vérification des fonctions, sans recopier systématiquement toutes
les commandes de qualité. `quality:cycles`, `quality:duplication`,
`quality:complexity`, `quality:dead-code` et `quality:top-heavy` ne sont **pas**
des contrôles automatiques `DEVELOPMENT` ; les exiger seulement si un risque
ciblé le justifie, ou dans `FULL` lorsqu'il est autorisé. Cette règle prévaut
sur les anciennes listes de commandes systématiques.

## MAIN-ONLY / MULTI-WRITER COORDONNÉ

Le workflow `MAIN-ONLY / MULTI-WRITER COORDONNÉ` reste applicable aux writers
concurrents : ChatGPT identifie au début de toute contribution directe la
référence Git et les fichiers attribués ; Codex le fait au début de son
exécution locale. Cette référence et ce périmètre restent gelés jusqu'à la
clôture. Les changements préexistants ou apparus ensuite sont étrangers,
préservés et exclus. Seules les modifications du writer attribué (ChatGPT ou
Codex) sont intégrées au candidat final. Les prompts de passation interdisent
l'extension
automatique du périmètre, la resynchronisation fonctionnelle et le rejeu de
validations globales à cause d'une évolution externe de `HEAD`, `origin/main`,
de l'index ou du worktree. Ils demandent de préserver et signaler toute
collision sur un même chemin, sans écrasement ni fusion silencieuse.

Les validations globales se font sur les candidats immuables déjà fournis par
`scripts/ci`, correspondant au contenu contrôlé ; aucun résultat du worktree
mutable n'est attribué à un SHA. Un échec sur le candidat gelé reste visible :
corriger les défauts du lot, distinguer les défauts préexistants ou étrangers,
et ne pas relancer un contrôle global ni transformer FAIL en PASS.
Les scopes `WORKTREE_LIVE`, `STAGED`, `COMMITTED_SNAPSHOT` et `PUSH_CANDIDATE`
restent distincts ; une preuve locale ne devient pas une preuve de publication.

Pour un lot réalisé directement, ChatGPT valide le candidat attribué, puis
commit → push fast-forward `main` → fetch et vérification de convergence. Si le
lot est confié à Codex pour ses besoins de checkout ou de runtime local, son
prompt prescrit cette même séquence. Au moment de publier, contrôler uniquement
l'attribution des commits transmis, le fast-forward, les hooks, permissions et
convergence ; une évolution externe sans conflit ne relance pas les validations.
Un conflit réel arrête la publication avec son diagnostic exact, sans boucle
de synchronisation. Le mode de développement rapide ne supprime pas cette
publication ; une interdiction explicite de l'utilisateur reste la seule raison
de clôturer un lot sans push.

Les protections Git, secrets, intégrité, concurrence et fast-forward restent
obligatoires, mais un défaut, un préflight Supabase bloqué ou une validation
manquante ne retient pas un push autrement publiable.
L'existence d'un ruleset ou un refus d'autorisation seulement supposé ne justifie
pas un arrêt anticipé : vérifier l'identité Git et ses permissions effectives,
puis tenter le push normal lorsque le candidat est sûr. Une publication n'est
acquise qu'après le succès du push, un fetch et la convergence vérifiée de
`HEAD` et `origin/main` (ahead/behind `0/0`). En cas d'échec réel, rapporter le
refus observé et l'action nécessaire, sans contourner les hooks ou protections.

## 8. Exécution, tests, qualité et publication

ChatGPT respecte `MAIN-ONLY / MULTI-WRITER COORDONNÉ` sans exiger l'arrêt des
autres writers. Les chemins dirty étrangers sont préservés ; un conflit sur un
chemin attribué est signalé et bloque sa mutation/publication. Toute exécution
qui produit un lot valide uniquement le candidat gelé, committe ses changements
attribués, pousse `main` en fast-forward et vérifie la convergence, sauf
interdiction explicite de l'utilisateur. Les scopes Git, hooks,
pre-push, candidats et blocages host sont **uniquement** gouvernés par
`AGENTS.md`, `scripts/AGENTS.md`, `TESTING.md` et
`documentation/development/host-environment.md`. Ne pas recopier leur
implémentation dans un prompt.

Choisir des validations proportionnées : tests ciblés et cas contraires,
contrats partagés, sécurité et lint/typecheck concernés ; `checks:fast` si rayon
d'impact suffisant. Le `FULL` sur candidat immuable (`prepush:guard -- -Full`)
est réservé à une demande qui lui est dédiée ou à la préparation immédiate d'un
déploiement Vercel explicitement demandé. Son absence ne bloque jamais un lot
ordinaire. `RELEASE` contrôle un SHA et la
preuve FULL requise, ne déclenche pas un déploiement. Les tests statiques et
mockés ne prouvent ni l'exécution PostgreSQL, ni un navigateur réel, ni la
production. Mentionner `DB_SEMANTICS_NOT_EXECUTED` le cas échéant.

Ne pas lancer d'audit lourd général « par précaution », ni masquer une
régression en modifiant ratchet, baseline, test ou périmètre du contrôle. Pour
une correction récurrente ou une validation trompeuse, traiter la cause et la
prévention utile dans le même lot selon `repo-quality-rules.md`. Une CI verte,
un commit, un push et un déploiement ne sont pas des preuves interchangeables.

## 9. Documentation, coûts, fichiers et passation

Une connaissance durable vit dans **une seule source canonique**. Conserver les
statuts `CURRENT`, `PLAN`, `AUDIT`, `HISTORY`, `SNAPSHOT`, `ADR` et `GENERATED`.
Mettre à jour les fiches `documentation/pages_site/routes/` uniquement lorsque
la page change durablement, sans restructurer leur zone protégée. Préserver
aussi `documentation/pepite/` sauf demande explicite. Ne pas créer de nouveau
document pour une règle déjà couverte, ni transformer un audit en état courant.

Pour les services externes, vérifier coûts, quotas et limites **actuels** lorsque
la décision en dépend ; préférer solution déjà intégrée, chargement à la demande,
cache ou pagination lorsque le contrat le permet. Ne pas présenter une mesure
offline, une fixture ou un snapshot comme l'état d'un fournisseur. Pour les
sources privées complémentaires, appliquer la politique canonique
`documentation/development/DOCUMENTATION_POLICY.md` ; consulter Drive uniquement
lorsque pertinent via le connecteur autorisé, et signaler son indisponibilité
sans inventer d’information.

### Pré-intégration proactive et livrables candidats

Avant de déléguer un chantier technique substantiel à Codex, évaluer explicitement
ce que ChatGPT peut produire **immédiatement et de façon fiable** avec les
sources, outils et contrats disponibles. Lorsque cela réduit réellement le
travail d'intégration, préparer spontanément les livrables exploitables :
contrats, fichiers complets, fonctions métier pures, fixtures, tests,
maquettes statiques pertinentes ou SQL candidat non appliqué. Ne pas attendre
une seconde demande « génère les fichiers » si l'objectif est déjà suffisamment
défini. Faire les recherches et arbitrages possibles ici, plutôt que de les
transférer à Codex.

La préparation commence par les owners, leurs consommateurs et les conventions
du `main` actuel. Préférer l'extension de code existant aux modules parallèles,
et un fichier complet directement intégrable à une abstraction de démonstration.
Ne générer que les artefacts dont l'utilité est établie. Vérifier leur contenu,
exécuter les contrôles accessibles et distinguer preuve statique, test isolé,
test du workspace, intégration et production. Tout candidat non exécuté dans
le runtime reste `CANDIDATE`, jamais `CURRENT` ou « testé par Codex ».

Pour les chantiers **Mon empreinte IA**, utiliser
`documentation/specs/empreinte-ia/README_CODEX.md` comme index de passation.
Avant chaque lot, lire les spécifications, l'errata applicable, la passation et
les candidats de code et de tests associés. Rechercher leurs équivalents dans
le `main` actuel, puis réutiliser ou adapter les candidats sans créer de
doublons. Intégrer et valider selon `AGENTS.md`, préserver les décisions
scientifiques les plus récentes et signaler toute incompatibilité démontrée.
Les candidats restent des propositions, pas des fonctionnalités déjà
intégrées. Ne jamais copier directement le SQL candidat dans les migrations ni
publier les fichiers temporaires de passation.

Pour plusieurs fichiers liés ou plusieurs lots séquencés, lorsque le gain est
réel, fournir un **dossier unique** de pré-intégration dans une zone de spec
temporaire appropriée, avec chemins cibles préservés, manifeste bref, ordre des
sources/errata, fichiers candidats, tests, preuves et limites. Le manifeste doit
permettre de repérer les versions obsolètes, les dépendances et les collisions.
Éviter les archives doublonnées et les copies dans les chemins runtime avant
intégration. Un prompt Codex doit pointer explicitement vers les candidats à
examiner, réutiliser ou adapter ; leur découverte par recherche agentique ne
suffit pas comme garantie d'intégration. ChatGPT prend en charge le checkout
GitHub, les consommateurs, les tests accessibles et la publication directe.
Codex complète les validations qui nécessitent l'environnement local, les
secrets ou un runtime non disponible à ChatGPT ; les migrations suivent toujours
leurs autorisations spécifiques.

Cette proactivité reste **proportionnée** : pas de pack artificiel pour une
question, une étude exploratoire ou un défaut local simple ; pas de code
spéculatif si les données nécessaires manquent. Une simple demande « Vérifie
les commits » conserve exclusivement le contrat de sortie de
`COMMIT_REVIEW_PROTOCOL.md`, sans artefacts spontanés ni élargissement du lot.

Quand l'utilisateur demande de créer ou remplacer un fichier précis et que le
contexte suffit, produire son **contenu final complet**, conserver exactement
son nom cible et indiquer son emplacement dans le dépôt. Pour plusieurs
fichiers, livrer séparément ou en ZIP si utile, en préservant les chemins ;
le ZIP n'est qu'un transport, jamais une source de vérité. Ne jamais fournir
un extrait présenté comme remplacement complet. Ne pas créer de clone ou
worktree Git. La modification du dépôt GitHub, le commit et le push direct
restent autorisés pour une contribution attribuée, validée et publiée selon la
section 3 et `AGENTS.md` ; ne pas contourner les protections ni intégrer les
changements étrangers.

Un chantier long conserve seulement : objectif, état vérifié, décision,
incertitudes actives, `STOP CONDITION` et prochaine action. Pour la passation,
le message du commit et l'état final de `main` priment sur un bilan de
conversation. Une passation historique reste du contexte, non un contrat du
runtime. Ne pas ouvrir un nouveau prompt sans gain de preuve ou décision
nouvelle. Ne pas poursuivre une suite d'audits et micro-corrections si la cause
commune peut être traitée une fois ou si les invariants sont déjà satisfaits.

## 10. Clôture

Avant de conclure : objectif réel traité, source canonique respectée, contrat
et AuthZ préservés, effets et consommateurs vérifiés au niveau approprié,
preuves réellement exécutées, aucune donnée ni modification étrangère perdue,
documentation `CURRENT` réalignée si nécessaire, limites déclarées et
`STOP CONDITION` atteinte. Après un lot ChatGPT ou Codex publié, **relire `main`** et
vérifier ce qui est effectivement intégré. Sinon qualifier le blocage sans
inventer une réussite.

L'objectif final est un produit plus utile, une architecture plus simple, des
données et droits plus fiables, des coûts maîtrisés et des décisions
**vérifiables**, sans multiplication de code, prompts, documents ou procédures.
