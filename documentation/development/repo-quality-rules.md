# Règles de qualité du dépôt

Ce document complète les consignes du dépôt avec les règles opérationnelles
spécialisées de qualité. Il ne remplace pas les contrats de sécurité, de test,
d'architecture ou de domaine.

## 1. Prouver avant de modifier

- Vérifier l'état courant de la source ciblée avant de décider.
- Reproduire ou caractériser le problème avec un test, un audit ou une
  observation précise lorsque c'est pertinent.
- Ne pas traiter une ancienne note, un ancien plan ou une alerte historique
  comme une preuve de l'état courant.
- Séparer dans le compte rendu : implémenté, configuré, testé et observé.
- Préférer la cause racine à un contournement qui rend seulement un contrôle
  vert.

## 2. Contrats de données

- Toute donnée écrite dans `actions` passe par le contrat de normalisation et la
  source unifiée appropriée.
- Les valeurs `measured`, `derived`, `estimated` et `missing` restent distinctes
  dans les types, les exports et les interfaces.
- Une géolocalisation est explicitement `valid`, `missing`, `partial` ou
  `invalid`. Un compteur nommé `missing` ne doit pas inclure les trois autres
  états.
- Une anomalie bloquante doit empêcher l'écriture ou la diffusion concernée et
  être couverte par un test.

## 3. Tests de non-régression

- Toute correction de logique ajoute ou renforce un test de cause racine
  lorsque l'infrastructure le permet.
- Pour une route ou une page protégée, couvrir les états d'accès réellement
  pertinents au contrat modifié.
- Les tests d'exports vérifient le contenu, le type de fichier et les
  permissions, pas seulement le statut HTTP.
- Commencer par les tests ciblés. Élargir aux tests de contrat puis aux suites
  plus larges selon le risque du lot.
- Ne pas paralléliser plusieurs processus Vitest qui recouvrent les mêmes tests
  sans preuve de stabilité ; Vitest conserve sa propre parallélisation interne.
- Une suite globale n'est pas une obligation mécanique pour chaque micro-lot :
  elle reste une preuve plus large lorsqu'une publication, une frontière
  partagée ou le risque du changement la justifie.

## 4. Documentation et routes

- Une route canonique possède une entrée dans `documentation/pages_site/INDEX.md`
  et une fiche existante.
- Un alias ou une redirection doit indiquer explicitement sa cible. Une route
  supprimée ne doit plus être présentée comme canonique dans une matrice.
- Ne pas référencer un fichier absent.
- Les plans actifs restent distincts des documents publics et leur statut doit
  être lisible.
- Une règle technique transversale vit dans un document canonique, puis est
  liée depuis les index ; elle n'est pas copiée dans plusieurs backlogs.

## 5. Modularisation

La source spécialisée est
`documentation/development/conventions-modularisation.md`.

- Traiter une cible principale à la fois.
- Conserver props, exports, routes et contrats publics sauf décision distincte.
- Les seuils sont déterminés par `classifyFileKind()` : runtime REVIEW
  `>500` lignes ou `>40 KiB`, HARD `>1000` lignes ou `>50 KiB` ; test REVIEW
  `>1000` lignes ou `>50 KiB`, HARD `>1500` lignes ou `>80 KiB` ; data/config
  REVIEW `>800` lignes ou `>50 KiB`, HARD `>1500` lignes ou `>80 KiB`.
  `generated` reste informatif et n'est exclu que si sa régénérabilité est
  prouvée.
- `REVIEW_REQUIRED` est un signal d'audit sans split automatique ; en mode
  `--enforce`, le ratchet numérique bloque tout nouveau REVIEW/HARD et toute
  croissance au-delà du plafond mesuré pour son KIND.
- Utiliser la taille comme signal, jamais comme décision d'extraction isolée.
- La taille d'un test mesure la lisibilité et la cohésion des scénarios ; elle
  n'est pas traitée comme un monolithe runtime.
- Les statuts sont `REVIEW_REQUIRED`, `PROACTIVE_SPLIT`,
  `COHESIVE_SINGLE_FILE`, `ALREADY_MODULARIZED` et `DEFERRED_SPLIT`.
- `DEFERRED_SPLIT` exige une raison et un déclencheur de reprise.
- Ajouter ou conserver les tests avant de supprimer une implémentation legacy.
- Ne jamais ajouter une exception HARD au baseline sans justification, ref de
  revue, plafonds `maxLines`/`maxBytes` et décision architecturale explicite.
  Les entrées `review[]` portent seulement un plafond numérique et ne valent
  jamais `COHESIVE_SINGLE_FILE`.
- Régénérer ou revalider le radar avant de choisir le lot suivant.

## 6. Performance, dépendances et sobriété

- Une nouvelle dépendance ou un nouveau service doit répondre à un besoin réel
  que les capacités existantes ne couvrent pas raisonnablement.
- Éviter les requêtes, calculs, stockages et assets redondants lorsqu'une
  solution plus simple fournit le même contrat.
- Isoler un service tiers derrière une frontière claire lorsque cela réduit
  réellement le couplage ou facilite sa substitution.
- Ne pas imposer une abstraction ou un fournisseur uniquement pour une
  promesse de sobriété non mesurée.
- Toute affirmation chiffrée d'impact, d'économie ou de performance doit être
  soutenue par une mesure, une source ou un protocole explicite.
- Les contraintes spécifiques Vercel, Supabase, assets, cache et quotas restent
  dans leur documentation opérationnelle spécialisée.

## SonarQube Cloud — baseline et protocole de comparaison

SonarQube Cloud est un analyseur externe complémentaire de qualité statique et
de sécurité. Il n'est ni un service runtime de CleanMyMap, ni une preuve
directe d'une permission, d'une transaction PostgreSQL ou d'une exploitabilité
en production. Le projet de référence est
[`maxd4_CleanmyMap`](https://sonarcloud.io/project/overview?id=maxd4_CleanmyMap).

SonarQube doit être distingué des contrôles internes `audit:quality` et
`audit:modularity`, de CodeQL, de Semgrep et des tests : ces outils n'ont pas le
même moteur, le même périmètre ni le même niveau de preuve. Un *Bug*, une
*Vulnerability*, un *Code Smell* ou un *Security Hotspot* est d'abord un
signal à qualifier ; un finding statique ne démontre pas à lui seul un défaut
exploitable. Le *Quality Gate*, la dette conventionnelle et la couverture sont
des indicateurs contextualisés, pas des autorisations de publication.

Le snapshot initial est conservé dans
[`CleanMyMap_SonarQube_Bilan_2026-10-13.md`](../operations/audits/CleanMyMap_SonarQube_Bilan_2026-10-13.md).
Il reste classé `SNAPSHOT / AUDIT` et ne décrit pas l'état courant de `main`.
Sa couverture est `NON MESURÉE` tant qu'aucun rapport de couverture valide
n'est importé. Le mode d'analyse souhaité est manuel et non systématique sur
chaque push ou pull request, afin de contrôler le coût et la charge CI ; les
réglages réellement actifs sur SonarQube Cloud doivent être distingués de la
configuration souhaitée et des analyses historiques observées.

Avant toute correction issue d'un finding :

- qualifier la cause racine, l'exposition réelle, les consommateurs et les
  tests concernés ;
- ne pas supprimer de tests, exclure un répertoire, affaiblir une règle ou
  modifier le périmètre uniquement pour améliorer un score ;
- ne pas additionner bugs, sécurité, dette et code smells comme s'il s'agissait
  d'une même mesure ;
- conserver séparément les anomalies résolues, introduites, reclassées,
  déplacées, non analysées et les faux positifs caractérisés.

Le comparatif avant/après doit utiliser, autant que possible, le même projet,
la même branche, le même périmètre, les mêmes exclusions, les mêmes règles,
ainsi que des versions de moteur et de Quality Profile documentées. La
baseline `AVANT` comprend le SHA, la date, les fichiers, le NCLOC, les bugs,
les vulnérabilités, les smells, les sévérités, les notes, la dette, la
duplication, la couverture et le Quality Gate observés dans le snapshot. La
baseline `APRÈS` ne peut être produite qu'après une nouvelle analyse réelle et
doit conserver son SHA exact. Une variation de fichiers ou de NCLOC n'est pas
une correction de dette ; une couverture absente ne se compare pas à une
couverture future en points de pourcentage. Si le périmètre ou la méthode
change sans rapprochement fiable, le résultat est `NON_COMPARABLE`.

## 7. Validation et livraison

- Lancer les contrôles ciblés après une correction, puis les contrôles adaptés
  au risque avant la livraison.
- Une commande échouée reste échouée dans le rapport, même si une autre
  commande passe dans un environnement différent.
- Un échec provenant d'un chantier parallèle doit être distingué d'une
  régression du candidat ; il ne doit ni être masqué ni provoquer une
  modification hors périmètre.
- Préserver les modifications utilisateur hors périmètre avec un staging
  ciblé.
- Suivre la politique Git canonique du dépôt pour le commit et le push ; ne pas
  la recopier ici.

### Revue proportionnée au changement

Le niveau de revue dépend du risque et du périmètre réellement touché :

- **Modification simple** : relire les fichiers modifiés et leurs dépendances
  directement pertinentes, repérer les mauvaises pratiques évidentes dans le
  code ajouté ou modifié, puis exécuter uniquement les contrôles et tests
  adaptés au changement.
- **Modification sensible** : renforcer l'analyse lorsqu'elle touche
  notamment l'authentification, les autorisations, les données, les imports
  externes, les transactions, les suppressions ou l'exécution de commandes ;
  vérifier alors les scénarios négatifs et les invariants métier nécessaires.
- **Défaut récurrent** : identifier la cause racine, puis réutiliser ou
  renforcer un contrôle existant seulement si cela apporte une prévention
  mesurable. Ne pas créer une règle automatisée coûteuse, redondante ou trop
  sujette aux faux positifs.
- **Audit global** : réserver les scans complets et les comparatifs SonarQube
  aux exécutions manuelles ou aux jalons de chantier. Une petite correction,
  un prompt ou un commit ne requiert pas par défaut une nouvelle analyse
  SonarQube.

Cette revue complète les règles de la section 8 et les modes de validation de
[`TESTING.md`](./TESTING.md) ; elle ne crée pas de second protocole.

## 8. Boucle de prévention des récidives après correction

Cette boucle s'applique dans le lot courant lorsqu'une demande corrige une
régression, une erreur de revue, un lot déclaré terminé mais incomplet, une
validation trompeuse ou insuffisante, une erreur répétée de conception, de
type, de sécurité, de données ou de test, ou un micro-correctif de suivi. Elle
est déclenchée par la nature du problème, même si le prompt n'emploie pas les
termes « micro-lot » ou « revue ». Elle ne crée pas automatiquement un second
projet : la prévention reste dans le plus petit lot cohérent qui corrige le
problème.

### A. Établir la cause racine

Pour chaque correction concernée :

1. vérifier le défaut dans le code, le contrat ou le comportement réel actuel ;
2. distinguer un défaut prouvé, un risque plausible et une hypothèse non
   vérifiée ;
3. identifier la cause racine plutôt que le seul symptôme ;
4. vérifier les tests et protections qui auraient dû empêcher le défaut ;
5. identifier l'invariant qui aurait empêché sa réapparition.

Une observation de revue ne devient pas une preuve par sa seule formulation.
Une hypothèse non confirmée ne doit pas être généralisée ni transformée en
règle durable.

### B. Corriger et démontrer le comportement

La correction est la plus petite modification cohérente qui rétablit le
contrat. Lorsque l'infrastructure le permet, elle ajoute ou renforce un test
de régression et démontre l'échec avant correction puis le succès après
correction. Le compte rendu distingue les preuves statiques, mockées et
comportementales.

Pour PostgreSQL, RLS, les transactions, la concurrence et les services
externes, une inspection statique ou un test mocké ne constitue pas une preuve
d'exécution comportementale réelle. Une vérification de texte ou de présence
d'une chaîne ne remplace pas un test du comportement couvert.

### C. Évaluer le risque de récidive sans lancer un audit global

Inspecter uniquement les zones directement analogues et les contrats partagés
par la correction. Classer le risque avec les catégories suivantes :

- `LOCAL` : le défaut reste limité à la frontière corrigée et aucun contrat
  partagé n'est exposé ;
- `GENERALISABLE` : le même invariant peut échouer dans une ou plusieurs zones
  directement analogues ;
- `RECURRENT` : le défaut, ou la même classe de défaut, réapparaît alors
  qu'une correction ou une protection antérieure existait déjà ;
- `CRITICAL` : le défaut touche notamment AuthN/AuthZ, les secrets, l'intégrité
  ou la perte de données, une migration, une transaction sensible, ou un autre
  risque dont l'impact impose une prévention renforcée.

Les catégories peuvent se cumuler lorsqu'elles décrivent des dimensions
différentes ; `CRITICAL` fixe alors le niveau de prudence. Cette boucle ne
déclenche pas un audit exhaustif du dépôt par défaut.

### D. Choisir une prévention proportionnée

Choisir, selon le risque établi :

- un test lorsque le comportement est automatisable ;
- une règle canonique lorsque l'invariant durable manque de propriétaire
  documentaire ;
- un garde automatisé lorsque le défaut est répété, critique ou prévenable par
  un contrôle simple et maintenable ;
- aucune nouvelle protection lorsque les tests et contrats existants couvrent
  déjà correctement le cas.

Un défaut documenté et récurrent appelle le renforcement du test ou du garde
existant, pas une deuxième formulation concurrente. Ne pas créer
automatiquement un fichier de gouvernance racine, une règle ESLint, une migration, une étape CI
ou un script : chacune de ces protections doit être justifiée par le risque,
son propriétaire et une validation exploitable.

### E. Capitaliser au bon endroit

Le propriétaire de la prévention détermine son emplacement :

- contrat de domaine : documentation canonique du domaine et tests associés ;
- méthode de test ou de validation : documentation qualité/tests et preuve
  exécutable ;
- sécurité : documentation sécurité et tests de sécurité ;
- règle universelle d'exécution : gouvernance racine, uniquement si le
  processus global change réellement ;
- retour daté : audit ou historique uniquement lorsqu'il conserve une valeur
  vérifiable.

Ne pas recopier une même règle dans plusieurs documents. Une erreur locale ne
justifie pas à elle seule une modification de la gouvernance racine.

### F. Cas de récidive

Lorsqu'une récidive est établie :

1. vérifier que la correction ou protection précédente existe encore ;
2. expliquer pourquoi elle n'a pas empêché le défaut ;
3. renforcer le contrat ou le contrôle partagé au bon propriétaire ;
4. ne pas se limiter à ajouter une seconde phrase dans un autre document.

Si le test précédent ne couvrait jamais le comportement réel, ajouter la
preuve manquante au niveau adapté au risque, au lieu de présenter la preuve
statique ou mockée comme suffisante.

### G. Clôture et compte rendu

Toute tâche qui déclenche cette boucle ajoute au compte rendu exactement un
statut de prévention :

```text
PREVENTION_RECURRENCE: TEST | CANONICAL_RULE | AUTOMATED_GUARD | EXISTING_PROTECTION_SUFFICIENT | BLOCKED
```

Le compte rendu précise brièvement la cause racine et la classe de risque, la
protection choisie et son emplacement, les preuves réellement exécutées et
leurs limites. Si aucune nouvelle règle n'est nécessaire, il explique pourquoi
les protections existantes sont suffisantes. `BLOCKED` est réservé à une
prévention nécessaire mais impossible à établir ou à exécuter dans
l'environnement autorisé ; il ne masque pas une preuve manquante.

### H. Exemples de périmètre, sans relancer les lots SPOGOMI

Ces exemples illustrent la méthode et ne rouvrent aucun lot SPOGOMI :

- pour une cible SQL `ON CONFLICT`, un test comportemental PostgreSQL prouve
  l'inférence réelle ; le texte d'un index ou d'une migration ne suffit pas ;
- pour une pagination, un test dépassant la limite de lecture vérifie la
  lecture exhaustive et l'invariant associé ; il ne faut pas créer un helper
  universel si les services existants suffisent ;
- pour l'idempotence, tester le cycle complet de reprise, le propriétaire et
  la déduplication côté serveur ; la seule présence d'un UUID ne constitue pas
  une preuve.

### I. Limites

Cette boucle ne justifie ni un lot indéfini, ni une règle pour une simple faute
de frappe, ni une campagne globale de tests sans risque démontré, ni la
réécriture d'une migration publiée, ni un élargissement Kaizen. Elle ne crée
pas une mémoire d'erreurs parallèle et ne permet pas de masquer une preuve
manquante. Toute protection ajoutée doit rester maintenable et vérifiable dans
l'environnement réellement disponible.

## 9. Cadrage transversal avant le premier lot et revue après publication

Cette méthode **prévient** les récidives avant l'implémentation. Elle complète
la boucle réactive de la section 8, sans réouvrir automatiquement les lots clos.

### A. Cartographier le contrat avant le premier prompt

Pour tout lot qui modifie des données persistées, un état métier, une
permission, une transaction ou un contrat consommé par plusieurs surfaces :

1. déterminer l'owner canonique de chaque donnée et de chaque décision ;
2. recenser de manière bornée **toutes les voies directement pertinentes de
   mutation**, y compris import, route API, service, RPC, trigger, tâche ou
   écriture administrative autorisée, et les consommateurs de ces mutations ;
3. identifier les transitions d'état autorisées, les garde-fous existants et
   leurs éventuels contournements par une autre voie ;
4. définir les effets attendus sur les identités, relations, historiques,
   résultats, accès, agrégats et projections concernées ;
5. décider avant le premier prompt du plus petit lot **complet** capable de
   préserver ces invariants et de sa condition d'arrêt.

L'inventaire n'est ni une campagne de recherche globale ni un livrable
obligatoire pour une correction de texte ou un changement purement local.
Le périmètre s'élargit seulement jusqu'aux dépendances nécessaires pour
prouver le contrat réellement modifié.

### B. Énoncer un invariant vérifiable

Pour chaque invariant significatif, préciser, sous forme concise ou tabulaire :

- **propriétaire** et **état initial** ;
- **acteur autorisé**, mutation permise/interdite et **transition d'état** ;
- **effets** sur les consommateurs, identités, relations et historiques ;
- **contre-exemple** ou scénario négatif prouvant une violation ;
- **preuve attendue** : `STATIC_CONTRACT`, `EXECUTED_BEHAVIOR` ou
  `INTEGRATION_PROOF`, selon `TESTING.md` ;
- **incertitude ou blocage** et décision d'acceptation du risque.

Les tests couvrent les cas normaux **et** adverses réellement pertinents :
refus, annulation, reprise, idempotence, état obsolète, accès interdit,
frontière inter-événements et concurrence lorsque le contrat les exige.
Ne pas créer un deuxième registre permanent d'invariants lorsque la
spécification métier ou les tests canoniques les portent déjà.

### C. Prévoir le niveau de preuve dès la conception

Si une propriété dépend de PostgreSQL (transaction, contrainte, trigger, RLS,
course concurrente), prévoir une exécution sur une base isolée autorisée
avant de la qualifier de prouvée. Vérifier les voies CI éphémères existantes
et leurs prérequis ; ne pas supposer qu'un workflow existant couvre le
scénario sans avoir vérifié ses tests et son déclenchement.

Un contrôle de migration, un `--dry-run`, une assertion textuelle ou un mock
peuvent être utiles, mais ne deviennent jamais `EXECUTED_DB_CONTRACT`.
Lorsque la preuve n'est pas disponible, rapporter
`DB_SEMANTICS_NOT_EXECUTED` et qualifier l'incertitude. Cette règle n'ajoute
pas `checks:full` comme obligation ordinaire et n'autorise aucune migration
ou mutation distante non approuvée.

### D. Classer chaque constat après publication

Toute observation de revue reçoit d'abord **une** classe principale :

- `INTRODUCED_REGRESSION` : comportement incorrect démontré et imputable au
  candidat ; à corriger dans le lot lorsque son contrat est compromis ;
- `PREEXISTING_CRITICAL` : défaut antérieur démontré avec risque élevé
  (sécurité, perte de données, intégrité, autorisations) ; prioriser avec
  périmètre et autorisation explicites, sans l'imputer artificiellement au lot ;
- `OUT_OF_SCOPE_IMPROVEMENT` : amélioration ou dette non bloquante, à différer
  sans ouvrir automatiquement un prompt ;
- `UNPROVEN_HYPOTHESIS` : scénario suspect non démontré ; rechercher la
  preuve proportionnée avant d'en faire un défaut ou une règle durable.

Comparer au `main` **avant et après** le candidat lorsque l'attribution est
matérielle. Si plusieurs défauts proviennent d'une même cause racine,
proposer une seule correction cohérente, avec ses consommateurs et tests.
Un nouveau prompt immédiat exige une preuve nouvelle et une nécessité réelle :
ne pas utiliser une découverte périphérique pour prolonger un lot satisfait.

### E. Clôturer sur les invariants et les preuves, pas sur la perfection

Clôturer dès que la `STOP CONDITION` du lot est atteinte, que les validations
requises ont été exécutées et que les limites de preuve sont déclarées.
Une dette non bloquante reste distincte ; un défaut critique connu ou une
preuve indispensable manquante ne doit pas être masqué sous le verdict
`PASS`. Distinguer une réalisation locale testée d'une intégration ou d'un
état distant réellement observé.

**Boucle cible :** analyse transversale → intégration → validation → clôture.
La revue d'un lot terminé n'est pas une autorisation générale de lancer une
nouvelle suite de correctifs.
