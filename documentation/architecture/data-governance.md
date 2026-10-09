# Gouvernance des données et contrats

Ce document définit les sources de vérité, les contrats métier et les règles d'accès aux données CleanMyMap.

## Sources de vérité

Il faut distinguer trois niveaux.

### Schéma versionné

Les migrations Supabase versionnées décrivent le schéma attendu.

Le workspace CLI canonique est :

```txt
apps/web/supabase/
```

Il n'existe pas de second arbre éditable. Le garde-fou
`npm run audit:supabase-migration-trees` doit rester vert avant toute
modification de migration.

### Base distante

La base Supabase distante est l'état runtime effectif.

Elle ne doit jamais être modifiée durablement sans migration associée.

### Contrats TypeScript

Les types et contrats du code doivent refléter le schéma et les règles métier.

Exemples :

```txt
apps/web/src/lib/actions/types.ts
apps/web/src/lib/actions/data-contract.ts
apps/web/src/lib/domain-language.ts
```

`apps/web/src/lib/actions/data-contract.ts` est une entrée publique étroite :
elle expose explicitement le contrat Actions, ses mappers et ses builders, sans
réexporter les types généraux ni les sous-domaines d'impact, de géométrie, de
contexte opérationnel ou de pollution. Les modules internes Actions importent
directement leur module propriétaire.

## Choix du stockage

Le choix de stockage dépend de la durée de vie, de la valeur métier et du
besoin de partage de la donnée :

| Type de donnée | Emplacement par défaut | Règle durable |
|---|---|---|
| Contenus pédagogiques, guides, décisions et checklists durables | Repo Markdown / Git | Versionner et publier comme contenu statique lorsque c'est possible. |
| Préférences UI, brouillons non critiques, quiz anonymes et états temporaires | `localStorage` | Les garder côté navigateur tant qu'ils n'ont pas de valeur métier durable ou de besoin multi-appareils. |
| Données métier vivantes, comptes, rôles, actions, participations et agrégats persistés | Supabase | Conserver une source de vérité serveur, appliquer les RLS et borner les lectures ; ne pas dupliquer le calcul métier côté client. |
| Données dérivées recalculables | Cache HTTP, ISR, `SWR` ou cache applicatif | Utiliser le cache pour réduire les lectures, jamais comme source de vérité. |
| Fichiers téléchargeables, images uploadées, PDF et exports réutilisables | Fichier préparé / Storage | Stocker seulement les métadonnées minimales en base si le fichier doit rester utile ou traçable. |

Les quiz anonymes et les brouillons non critiques ne doivent pas devenir une
nouvelle table par défaut. Supabase devient pertinent pour un suivi connecté
réellement utile, stable et justifiable entre appareils. Les formulaires à
soumission unique ne doivent pas persister chaque frappe ou un auto-save
permanent ; un document généré doit être produit à la demande et ne laisser en
base qu'un résumé minimal lorsque ce suivi apporte une valeur métier.

### Consentement du leaderboard public

Le propriétaire canonique du consentement de publication utilisateur est
`profiles.leaderboard_public_opt_in`, exposé à l'utilisateur connecté par
`/api/users/profile/leaderboard-opt-in`. Sa valeur par défaut est `false` et
aucun compte existant ne devient public par migration implicite. La route
publique Gamification lit ce consentement côté serveur avant toute projection;
elle ne reçoit ni ne fait confiance à un opt-in fourni par le navigateur. Les
identités de structure proviennent séparément des champs canoniques
`actions.organizer_id` et `actions.organizer_name` et ne constituent pas un
consentement utilisateur.

Déplacer une donnée métier de Supabase vers `localStorage` exige de préserver
la synchronisation, l'historique, les permissions et la conformité. En cas de
doute, conserver la donnée dans sa source de vérité serveur et documenter le
choix avant de créer une nouvelle persistance.

## Entités principales

| Entité | Table principale | Contrat |
|---|---|---|
| Action | `public.actions` | `ActionStatus`, `ActionListItem` et contrats actions |
| Signalement `spot` / `clean_place` | `public.trash_spotter_spots` | `SignalementModerationSource`, contrats unifiés |
| Spot legacy | `public.spots` | archive historique en extinction, sans lecture/écriture runtime |
| Profil | `public.profiles` | modèle Profile |
| Mission GPS | `public.missions` | types de `apps/mobile/types/mission.ts` |
| Point GPS | `public.gps_points` | types mission/location |

## Cycle de vie des actions

Le contrat TypeScript courant est :

```txt
pending
approved
rejected
```

Ne pas utiliser `validated` comme statut canonique si le runtime attend `approved`.

- `pending` : saisie en attente de validation ;
- `approved` : donnée approuvée et éligible aux usages publics selon le flux concerné ;
- `rejected` : donnée refusée.

Toute évolution de statut doit traverser :

- schéma ou contraintes ;
- types ;
- routes API ;
- UI ;
- exports ;
- tests ;
- documentation.

### Inscription future et participation finale

La séparation persistée est durable et dépend de la phase de l'action :

```txt
PRE-ACTION / POST_ACTION_DRAFT
→ public.action_registrations
→ inscription planifiée
→ registration_status / registration_source

POST_ACTION_COMPLETE
→ public.action_participants
→ participation finale
→ participation_status / participation_source
```

`action_registrations` est la source canonique des demandes futures, y compris
les ajouts manuels de pré-action. `action_participants` porte les participations
finales et les claims post-action ; une inscription future confirmée ne prouve
jamais une présence terrain. Les statistiques, badges, progression,
gamification et quotes-parts utilisent uniquement les lignes
`action_participants` dont `participation_status = confirmed`.

`actions.created_by_clerk_id` identifie le créateur et `action_organizers` porte
la responsabilité organisationnelle et les permissions associées. Créer,
organiser, changer de phase ou finaliser une action ne prouve jamais une
participation terrain : aucun de ces événements n'insère automatiquement une
ligne finale `confirmed`. Le créateur et les organisateurs peuvent demander
leur rattachement via `post_action_claim`, comme tout autre compte ; la demande
reste `pending` jusqu'à la validation du workflow existant.

La migration append-only qui neutralise les anciens callbacks ne supprime ni
ne reclassifie les lignes historiques. Elle conserve la sauvegarde/restauration,
les RLS et les triggers indépendants, et ne transforme pas une inscription
`action_registrations.confirmed` en présence.

### Signalements et modération

`public.trash_spotter_spots` est la source canonique runtime pour les nouveaux
signalements `spot` et `clean_place`. Les créations applicatives et la file de
modération passent par cette table et utilisent ses colonnes `spot_type`,
`validated_at` et `cleaned_at`.

`public.spots` est maintenant conservée comme archive historique
`service_role` read-only : aucune création, modération, carte, historique,
indicateur ou gamification ne la traite comme une source runtime équivalente,
et aucune RPC ni écriture runtime ne doit la cibler. Une commande de
maintenance ou de migration peut encore la lire explicitement avec
`service_role` pour une compatibilité offline bornée, sans que cette lecture
devienne une voie runtime. Son champ `waste_type` reste propre au chemin
legacy et n'est pas converti silencieusement en `spot_type`.

La migration
`apps/web/supabase/migrations/20260825000000_migrate_legacy_spots_to_trash_spotter.sql`
copie les lignes historiques vers `trash_spotter_spots` sans suppression,
conserve les champs utiles et écrit une correspondance idempotente dans
`public.legacy_spot_migrations`. Elle réutilise l'UUID legacy lorsqu'il est
libre et génère un nouvel UUID en cas de collision ; `legacy_waste_type` et
`legacy_notes` préservent la provenance.

La capacité `apps/web/src/lib/admin/moderation/signalement-moderation.ts` et les flux
unifiés utilisent désormais uniquement `trash_spotter_spots`. Les anciennes
clés d'événement XP (`spots` + `spot-id:*`) restent reconnues comme historique
dans la progression afin de ne pas réattribuer un XP après migration, sans
relire la table legacy.

La suppression physique de `public.spots` reste un lot ultérieur : elle exige
la preuve que la migration a été appliquée sur tous les environnements
historiques, que la correspondance de provenance est conservée et qu'aucun
outil d'import ou opération externe ne dépend encore de la table.

### Authentification des flux signalements/actions

Les handlers protégés de `/api/spots` et des écritures `/api/actions` utilisent
le helper central `requireAuthenticatedAccess`. En développement sur un hôte
localhost, l'identité de test peut être fournie par le bypass
`CMM_DEV_AUTH_BYPASS_*`, notamment pour les profils `benevole` et `max` déjà
prévus par les environnements locaux. Ce bypass reste limité au développement
et ne constitue jamais une identité HTTP de production ni un remplacement de
Clerk.

En production, Clerk reste obligatoire : une requête sans session conserve la
réponse `401`. `service_role` est réservé aux opérations serveur précisément
bornées ; il ne doit jamais être utilisé comme substitut d'une session
utilisateur HTTP. Le client Supabase serveur générique utilise la clé anon par
défaut. Un bypass RLS doit être demandé explicitement (`true` ou le helper
administratif dédié) après la décision AuthN/AuthZ du serveur ; l'anon key ne
porte toutefois pas à elle seule un JWT Clerk et ne remplace donc pas le
client RLS Clerk pour une lecture authentifiée.

Les contrats d'authentification et de gouvernance restent séparés de leurs
preuves ponctuelles d'exploitation. Les résultats de smoke, marqueurs,
identifiants temporaires et limites d'exécution sont conservés dans le
[CHANGELOG opérationnel](../operations/CHANGELOG.md), lorsqu'ils doivent être
préservés ; ils ne constituent pas le contrat CURRENT.

### Maintenance et opérations

Les outils d'opérations suivent la même séparation :

- `export-actions-backup.mjs` produit uniquement le format versionné de
  restauration d'état action ; `restore-actions-backup.mjs` est la seule voie
  de restauration et n'est pas un import métier ;
- `export-supabase-archive.mjs` archive `trash_spotter_spots`,
  `legacy_spot_migrations` et `spots`, ce dernier étant explicitement marqué
  comme archive legacy dans le manifeste ;
- `backfill-derived-geometry.mjs` cible par défaut `actions` et
  `trash_spotter_spots` uniquement ; il ne modifie jamais `spots`. Son mode par
  défaut est un dry-run auditable : chaque ligne est classée `PRESERVE`,
  `SAFE_UPDATE`, `AMBIGUOUS` ou `INVALID`, avec la provenance actuelle et une
  correction proposée bornée ; `--apply` n'applique que les `SAFE_UPDATE` ;
- ce backfill ne déduit jamais une provenance depuis
  `geometry_confidence` seul. Une reclassification historique exige une
  preuve persistée : source explicite valide, marqueur de dessin, metadata GPX,
  route persistée dont le mode/provider correspond à la géométrie, ou ellipse
  legacy reproduite exactement par l'algorithme historique. En l'absence de
  preuve, la ligne reste `AMBIGUOUS` et inchangée ; une géométrie techniquement
  inexploitable est `INVALID` ;
- les géométries valides `gps_tracking`, `gpx_import` et `manual` ne sont jamais
  remplacées automatiquement. Le moteur de reconstruction actuel ne sert pas
  à réécrire rétroactivement l'histoire. Les ellipses historiques démontrées
  peuvent seulement converger vers `estimated_area`, tandis qu'un vrai
  polygone reste intact. `trash_spotter_spots` est audité séparément : un
  signalement sans géométrie reçoit au plus son point persisté ; l'archive
  `spots` reste hors périmètre ;
- `db-cleanup-suspect-runtime-records.mjs` peut auditer les lignes `spots` pour
  le rapport, mais ses suppressions sont limitées à `actions` et
  `trash_spotter_spots` ; aucune option d'application ne peut supprimer
  l'archive legacy ;
- `sync-validated-local-store.mjs` est une commande explicite de synchronisation
  locale : elle lit la source canonique avant le fallback legacy historique,
  n'est pas appelée par le runtime web et ne réécrit jamais `spots` ;
- les contrôles de coordonnées et les règles d'identité restent indépendants
  de `waste_type`, qui ne devient jamais un discriminant `spot_type`.

## Validation des entrées

Toute API modifiant une donnée métier doit valider l'entrée.

Utiliser les schémas existants, notamment Zod, plutôt que des contrôles dispersés.

Vérifier :

- type ;
- bornes ;
- taille ;
- unité ;
- coordonnées ;
- enum ;
- ownership ;
- rôle ;
- état courant.

## Géolocalisation

Ne pas supposer qu'une coordonnée partielle est valide.

Vérifier :

- latitude et longitude ensemble ;
- bornes géographiques ;
- précision éventuelle ;
- provenance ;
- format GeoJSON si utilisé ;
- cohérence avec le type de géométrie.

### Attribution départementale des actions

`public.actions.department_code` et `public.actions.department_name` forment
une attribution persistée dérivée de la géométrie ou des coordonnées de
l'action. Pour une création ou une modification utilisateur, le serveur est
l'autorité : les valeurs éventuellement présentes dans le payload client ne
peuvent jamais remplacer la résolution géographique serveur.

Lorsqu'une géographie change, l'attribution est recalculée ; si aucune
géographie résoluble n'est disponible, les deux champs redeviennent `null`.
Une attribution serveur existante peut uniquement être conservée lorsqu'il
n'y a pas de changement spatial. Les imports administrateur et les opérations
de modération peuvent conserver une attribution explicite, mais seulement via
leur voie serveur explicitement qualifiée `trusted`, séparée du payload
utilisateur ordinaire.

Le code reste une chaîne afin de préserver `01`, `2A`, `2B` et les codes
d'outre-mer. Cette attribution géographique sert au contrat de données et aux
comparaisons départementales ; elle ne constitue pas, à elle seule, une preuve
d'AuthZ territoriale.

### Résolution territoriale des formalités administratives

Le moteur administratif consomme cette géographie canonique pour résoudre le
territoire compétent d'une action avant de sélectionner une règle. Une
résolution peut préciser la commune et son code INSEE, le département, la
région et, lorsqu'il est explicitement dérivé par une règle, un territoire
spécialisé. Elle ne crée pas une seconde source de géographie ni une
autorisation territoriale.

Les règles partagent le contrat de formalités existant et déclarent un scope
`national`, `department`, `commune` ou `special_territory`, avec son identifiant
explicite. Elles sont évaluées par précision décroissante (commune ou
territoire spécialisé, département, national). Une règle plus précise ne
supprime une règle générale que si la relation de remplacement est déclarée ;
des formalités compatibles peuvent donc coexister. Paris est la première règle
spécialisée (`FR-PARIS`) de ce moteur générique, pas un workflow parallèle.

L'autorité est portée par chaque règle et peut rester `unknown` lorsque la
source ne permet pas de l'identifier. Aucune mairie, préfecture ou autre
autorité n'est déduite du seul territoire. Toute règle canonique conserve une
source officielle, sa provenance, son périmètre territorial et sa date de
vérification.

La résolution administrative est invalidée lorsque le fingerprint territorial
change (par exemple Paris vers Lyon ou changement de département). Une simple
modification de libellé qui conserve le même territoire ne déclenche pas une
nouvelle résolution.

Lorsqu'aucune règle communale, spécialisée ou départementale suffisamment
vérifiée ne s'applique, le même moteur peut sélectionner le fallback national.
Il fournit alors un cadre officiel de référence et ses liens, mais conserve
`requirementStatus = unknown` tant que l'obligation locale exacte n'est pas
démontrée. `unknown` signifie que CleanMyMap ne dispose pas de preuves
suffisantes pour conclure à `required`, `recommended` ou `not_required` ; il ne
signifie ni absence de formalité, ni erreur technique.

La politique de publication reste stricte : `required` peut bloquer lorsque la
démarche requise n'est pas déclarée envoyée ; `recommended`, `not_required` et
`unknown` ne bloquent pas automatiquement. Le fallback national ne peut donc
pas transformer une information générale en obligation locale certaine. Après
un changement territorial, les règles précises et le fallback sont recalculés
par le même moteur.

## Unités

Utiliser des unités explicites dans les noms et contrats :

```txt
waste_kg
duration_minutes
distance_m
accuracy_m
```

Ne pas convertir silencieusement une unité sans documenter le contrat.

## Contrat de participation bénévole

Les nouvelles actions distinguent les trois catégories sources suivantes :
`childrenCount`, `adultCount` et `retiredCount`. Elles décrivent la répartition
des générations présentes sur l'action sans collecter l'âge exact ni la date de
naissance. Une valeur absente reste `NULL` ; elle ne doit pas être remplacée par
zéro pour rendre une catégorie artificiellement complète.

À la frontière HTTP ordinaire de création et de mise à jour, ces trois champs
sont les seules entrées acceptées dans `volunteerParticipation`. Les champs
dérivés `participantsCount`, `effectiveVolunteerUnits` et
`effectiveVolunteerUnitsFormulaVersion` sont rejetés lorsqu'ils sont fournis
par le client. Le serveur recalcule toujours ces champs après validation des
catégories sources, selon la normalisation canonique ; ils ne constituent donc
pas une autorité d'écriture cliente.

Lorsque les trois catégories sont renseignées, le nombre réel de personnes est
recalculé par la règle canonique :

```text
participantsCount = childrenCount + adultCount + retiredCount
```

Ce total est le nombre public de bénévoles et reste distinct de l'unité utilisée
pour certains indicateurs opérationnels. La dérivation versionnée
`effective-volunteer-units-v1` applique :

```text
effectiveVolunteerUnits =
  adultCount + 0,5 × childrenCount + 0,5 × retiredCount
```

Le coefficient `1` constitue l'unité de référence d'un adulte. Les coefficients
`0,5` pour un enfant et une personne retraitée sont une hypothèse métier
d'efficacité opérationnelle relative : ils représentent, à défaut d'une mesure
individuelle plus précise, une contribution moyenne estimée à la moitié de
l'unité adulte dans les tâches de dépollution. Ils ne signifient pas que chaque
enfant ou chaque personne retraitée a exactement la moitié de la capacité d'un
adulte et ne constituent pas une loi scientifique ou une évaluation de la valeur
des personnes. Toute évolution de cette hypothèse doit changer la version de la
formule et être justifiée par une décision métier documentée.

Les catégories sources permettent en parallèle d'observer la composition
générationnelle des actions et, lorsque les données sont complètes, d'en décrire
la répartition. Cette lecture descriptive ne doit pas être confondue avec une
mesure individuelle de performance ni avec le nombre de participants : les
KPI de participation utilisent `participantsCount`, tandis que les indicateurs
qui exigent une unité opérationnelle peuvent utiliser
`effectiveVolunteerUnits`.

Pour une action historique qui ne possède que `volunteersCount`, ce nombre reste
le total historique de participants ; `childrenCount`, `adultCount`,
`retiredCount` et `effectiveVolunteerUnits` restent inconnus. Le système ne doit
pas reconstruire la répartition générationnelle ni supposer que les participants
étaient adultes. Pour une saisie complète des trois catégories, le total est
borné à `500` participants ; une saisie partielle reste autorisée et conserve
les catégories inconnues.

### Présence physique et attribution personnelle

Le nombre physique de personnes présentes et le nombre de comptes éligibles à
une attribution personnelle sont deux notions différentes. Lorsque le
formulaire bénévole renseigne les trois catégories, `participantsCount` reste
calculé comme suit et continue d'alimenter les statistiques physiques :

```text
participantsCount = childrenCount + adultCount + retiredCount
```

Les enfants sont inclus dans ce total physique, mais sont strictement exclus de
toute répartition personnelle des déchets ou des mégots. Leur contribution de
terrain est incluse dans celle du compte utilisateur qui les accompagne.

Le dénominateur d'une quote-part personnelle est exclusivement constitué des
lignes `action_participants` dont `participation_status = 'confirmed'`. Chaque
ligne confirmée représente une unité d'attribution personnelle, quel que soit
le nombre d'enfants accompagnant ce compte. `volunteersCount`,
`participantsCount`, `childrenCount`, `adultCount`, `retiredCount` et
`effectiveVolunteerUnits` ne peuvent ni remplacer ce roster ni modifier ce
dénominateur. Ainsi, deux comptes confirmés avec deux enfants et `20 kg`
produisent `10 kg` par compte ; modifier le nombre d'enfants ne change aucune
quote-part tant que le roster confirmé ne change pas.

Cette séparation vaut aussi pour les badges d'impact Mohs : le nombre physique
de personnes présentes reste celui de `participantsCount`, tandis que les
comptes confirmés sont les seules unités éligibles aux attributions et au
calcul des seuils personnels. Les seuils Mohs utilisent l'équivalent sec
versionné lorsqu'une condition de déchets est connue et conservent une
provenance explicite pour les quotes-parts sans condition ; les compteurs
legacy à humidité inconnue ne sont pas reclassés silencieusement.

Pour chaque métrique additive, la répartition applique exclusivement les
comptes du roster confirmé :

```text
eligibleAccounts = comptes action_participants confirmed
exactAccounts = comptes confirmed avec une mesure individuelle pour la métrique
remainingAccounts = comptes confirmed sans mesure individuelle
remaining = total collectif - somme des mesures individuelles exactes
quotePart = remaining / COUNT(remainingAccounts)
```

Les mesures de `exactAccounts` sont conservées telles quelles. `quotePart` est
attribuée uniquement aux `remainingAccounts` ; lorsque ce dénominateur vaut
zéro, aucune division n'est effectuée. Les compteurs `adultCount` et
`retiredCount`, comme `childrenCount`, décrivent la présence physique du
formulaire et ne remplacent jamais les lignes confirmées de
`action_participants`.

## Contrat de mesure des déchets hors mégots

`wasteKg` désigne exclusivement la masse totale des déchets hors mégots,
exprimée en kilogrammes. Sa sémantique est stricte : `null` signifie « non
mesuré », `0` signifie « zéro explicitement observé » et une valeur supérieure
à zéro est une mesure connue. Aucune couche ne doit remplacer une valeur
inconnue par zéro pour compléter une mesure ou une ventilation.

La méthode de mesure est facultative et, lorsqu'elle est renseignée, utilise
une des valeurs suivantes : `balance_suspendue`, `balance_au_sol`,
`estimation_visuelle`, `autre` ou `inconnue`. Elle décrit la mesure de
`wasteKg`, pas une estimation implicite des mégots. Le nombre de mégots reste
une mesure séparée ; sa masse éventuelle est également séparée de `wasteKg`.

La ventilation canonique, également facultative et stockée dans la métadonnée
structurée de l'action, contient uniquement :

```txt
recyclablesKg
glassKg
householdWasteKg
otherWasteKg
```

Les champs descriptifs facultatifs `unusualObjects` et
`specialHandlingWaste` conservent respectivement les objets insolites et les
objets nécessitant une filière ou un point de collecte spécialisé. Chaque
catégorie de masse conserve la distinction `null`/zéro/valeur positive.

La somme des quatre catégories n'est comparée à `wasteKg` que lorsque les
quatre catégories sont effectivement renseignées par des nombres valides.
À la frontière serveur des payloads ordinaires et des corrections de
modération, `wasteKg`, `recyclablesKg`, `glassKg`, `householdWasteKg` et
`otherWasteKg` doivent respecter la résolution canonique de `0,1 kg`, exposée
par `ACTION_WASTE_MASS_RESOLUTION_KG`. Une valeur hors grille est rejetée ; le
serveur ne l'arrondit pas silencieusement. Cette contrainte ne s'applique pas à
la masse des mégots, qui reste une mesure distincte.

Pour une comparaison numérique, chaque valeur `x` alignée sur la résolution
est interprétée par l'intervalle
`[max(0, x - r/2), x + r/2]`, avec `r` égal à la résolution déclarée. Les
intervalles de `wasteKg` et de la somme des quatre catégories sont compatibles
s'ils se recouvrent ; sinon un avertissement non bloquant est affiché.
Les valeurs historiques hors grille restent lisibles et inchangées. La
comparaison retourne `not_comparable` lorsque les valeurs ne sont pas alignées
sur la résolution connue ou lorsque la résolution historique fiable n'est pas
démontrable ; elle ne les arrondit ni ne les réécrit.

Ce contrôle décrit uniquement la compatibilité numérique avec la précision de
saisie. Il ne modélise ni l'incertitude d'une balance, ni l'erreur humaine,
ni la précision d'une estimation visuelle, et n'introduit aucun coefficient
d'incertitude lié à `wasteMeasurementMethod`. Une ventilation partielle reste
partielle et ne devient pas une ventilation complète par imputation de zéros.
La différence absolue et `differencePercent` restent des informations
explicatives ; le pourcentage ne décide plus du statut.

Les anciennes clés `megotsKg`, `plastiqueKg`, `verreKg`, `metalKg`, `mixteKg`
et `triQuality` sont conservées uniquement pour la lecture bornée de données
historiques. Elles ne sont plus écrites par les formulaires ni converties
silencieusement vers les quatre catégories canoniques : la répartition d'une
ancienne mesure n'est pas connue sans nouvelle observation.

## Contrat des mesures de mégots

Les mesures de mégots sont conservées séparément dans le marqueur structuré de
l'action. Le contrat canonique expose :

```txt
cigaretteButtsCount
cigaretteButtsMassKg
cigaretteButtsVolumeLiters
cigaretteButtsCondition = propre | humide | mouille | NULL
```

Pour chacun des trois nombres, `NULL` signifie « non mesuré » et `0` signifie
« zéro explicitement observé ». Une valeur brute n'est jamais remplacée par une
valeur dérivée. Chaque mesure porte une provenance parmi `counted`, `measured`,
`weight_converted`, `volume_converted`, `estimated` et `unknown` ; la liste
contient au minimum les états métier `counted`, `weight_converted`,
`volume_converted`, `estimated` et `unknown`.

Les formulaires et les payloads HTTP ordinaires fournissent uniquement les
mesures brutes (nombre, masse, volume et état). La provenance et
`cigaretteButtsConversionFormulaVersion` sont attribuées par le serveur : un
comptage explicite devient `counted`, une masse ou un volume explicite devient
`measured`, et une dérivation autorisée devient `weight_converted` avec la
version de formule canonique. Une provenance envoyée par un client est ignorée
par la validation d'entrée et ne peut pas devenir une vérité persistée.

Le nombre brut de mégots reste borné par `MAX_CIGARETTE_BUTTS_COUNT`, fixé à
`5 000 000`. Les représentations HTTP `cigaretteButtsMeasurements.cigaretteButtsCount`,
`cigaretteButts` et `cigaretteButtsCount` utilisent cette même borne dans les
schémas de création, de mise à jour et de modération ; aucun alias ne conserve
une limite concurrente plus basse.

La création et l'édition appliquent le même contrat. Un `null` explicitement
envoyé efface la mesure correspondante ; il ne devient jamais zéro et son
ancienne provenance ne survit pas. Les aliases historiques restent lisibles
pour `COMPATIBILITY/LEGACY`, mais ne constituent pas une autorité concurrente
des mesures canoniques.

La conversion masse → nombre réutilise la formule runtime existante :
`nombre = masse_kg × 2500 × facteur_état`, avec les facteurs `propre = 1`,
`humide = 0,7` et `mouille = 0,4`. Elle est versionnée sous
`impact-terrain-2026-butts-mass-v1` et conserve l'état utilisé. La conversion
volume → masse ou nombre n'est pas effectuée tant qu'aucune relation fiable et
documentée n'existe ; le volume reste alors présent et les dérivés restent
`NULL`. Les champs historiques `cigaretteButtsKg` et `cigarette_butts` sont
des projections de lecture/compatibilité, jamais une seconde source de vérité.

## Attribution individuelle post-action

`action_participants` reste l'unique source canonique des participations finales.
La migration append-only `20260926000001_action_participant_individual_impact.sql`
ajoute les mesures individuelles à la ligne de participation confirmée, sans
créer de table métier parallèle. Les colonnes brutes sont :

```txt
individual_waste_kg
individual_waste_condition = sec | humide | mouille
individual_waste_measurement_method
individual_waste_normalization_version
individual_cigarette_butts_count
individual_cigarette_butts_mass_kg
individual_cigarette_butts_condition = propre | humide | mouille
individual_cigarette_butts_provenance = counted | measured | derived
individual_cigarette_butts_conversion_version
individual_impact_measured_by
individual_impact_measured_at
```

`NULL` reste distinct de zéro pour chaque mesure. La masse brute et le nombre
brut ne sont jamais remplacés par leur dérivé. La méthode, l'auteur et la date
de mesure sont contrôlés par le serveur et les changements sont journalisés
avec la valeur avant, la valeur après, l'action et la participation cible.
Seul l'organisateur réel de l'action ou un administrateur autorisé peut écrire
ces colonnes ; un participant ordinaire ne peut pas les modifier.

Pour chaque métrique additive, les participations `confirmed` ayant une mesure
comparable utilisent leur valeur individuelle. Si le total collectif est
connu, le reliquat est `totalAction - somme(mesures exactes)` et est réparti
uniquement entre les confirmés sans mesure. Si le total est inconnu, les
mesures connues restent affichées et les autres restent `NA`. Un dépassement
du total collectif rend la métrique incohérente, interdit tout reliquat négatif
et la rend inéligible aux nouveaux crédits Mohs tant qu'elle n'est pas résolue.
Cette attribution ne modifie jamais le total collectif.

Pour la seule gamification, l'équivalent sec des déchets est une hypothèse
versionnée `impact-terrain-2026-waste-moisture-v1` : `sec = 1,0`,
`humide = 0,7`, `mouille = 0,4`, donc `equivalentSecKg = masse_brute × facteur`.
Cette dérivation ne remplace pas `wasteKg` dans les résultats collectifs ou
les rapports. Les mégots réutilisent `impact-terrain-2026-butts-mass-v1` et
`2500 mégots/kg`; un comptage explicite prime toujours sur une conversion de
masse.

## Contrat temporel des actions

Le contrat métier distingue exactement deux notions :

- le `duration_minutes` existant est le temps d’action de dépollution. Il
  couvre la marche sur le parcours, le ramassage, le tri et la pesée, sans
  saisir ces étapes séparément ;
- `event_start_time` et `event_end_time` sont les heures du créneau total de
  l’événement, sur `action_date`. Ce créneau inclut l’action, le briefing, la
  constitution des groupes, la distribution du matériel, les regroupements et
  le rangement.

Les deux heures sont nullable. La durée totale de l’événement est dérivée
comme `event_end_time - event_start_time` lorsque les deux valeurs sont
connues et cohérentes le même jour. Le temps d’organisation est également
dérivé :

```txt
organizationMinutes = eventDurationMinutes - actionDurationMinutes
```

Les durées sont stockées et calculées en minutes exactes. Sur certaines
surfaces de synthèse destinées aux bénévoles, CleanMyMap arrondit uniquement
l'affichage au quart d'heure le plus proche afin de faciliter la lecture. Cet
arrondi UX ne modifie jamais la donnée source ni les calculs ; il ne s'applique
pas aux champs d'édition, aux exports, aux contrôles administratifs ou aux
preuves techniques qui attendent la minute exacte.

Une heure absente rend les deux durées dérivées indisponibles. Une heure
invalide, un rendez-vous après le départ, un horaire hors du créneau global,
une fin antérieure au début ou un créneau inférieur au temps d’action est
signalé comme incohérence ; aucune durée de passage à minuit, valeur historique
d’événement ou valeur fictive n’est reconstruite. Les anciennes valeurs de
`duration_minutes` restent intactes. Comme cette colonne reste
`NOT NULL DEFAULT 0`, `preparation_data.durationMinutesDeclared` distingue une
durée effectivement saisie de la valeur technique de compatibilité `0` ; une
durée inconnue reste vide dans l’interface. `estimatedDurationMinutes` dans
d’anciens `preparation_data` est lu uniquement pour compatibilité.

## Ingestion multi-source

Le module :

```txt
apps/web/src/lib/actions/unified-source.ts
```

est un point central de normalisation des actions.

Ce fichier racine est la façade publique de la capacité unifiée. Le dossier
`apps/web/src/lib/actions/unified-source/` contient son implémentation interne :
les consommateurs hors de ce sous-domaine utilisent `unified-source.ts` et ne
doivent pas créer un second chemin public vers `unified-source/index.ts`.

Toute ingestion externe, y compris l'import administrateur, doit appeler la
normalisation de ce module avant l'ecriture dans `actions`, puis utiliser le store
canonique. Les anomalies de date, de mesure et de geolocalisation sont exposees
par `apps/web/src/lib/actions/quality/data-quality.ts` afin que dashboard, rapports et
exports partagent le meme diagnostic.

La qualité conserve deux projections distinctes : `provenance.measures` garde
la taxonomie des mesures (`measured`, `derived`, `estimated`, `missing`), tandis
que `provenance.geometry` projette la source fine `ActionGeometrySource` vers
`observed`, `declared`, `reference`, `reconstructed`, `estimated`, `fallback`,
`missing` ou `unknown`. Ainsi, une trace `gpx_import` est observée, un tracé
`manual` est déclaré, `reference` est une géométrie connue, `routed` est
reconstruit, et `estimated_route`/`estimated_area` restent estimés. Une trace
`gps_tracking` est également observée : elle provient de `gps_points` persistés
par une mission terrain liée et promue côté serveur. Cette projection ne rend
jamais la mission ni ses points publics. Cette provenance géométrique ne
qualifie jamais une mesure d'impact et la confiance reste un champ séparé.

La promotion d'une observation remplace la géométrie active hypothétique de
l'action dans une mutation serveur cohérente. La source canonique de preuve est
`action_geometry_contributions` : chaque ligne garde `action_id`, `contributor_clerk_id`,
source `gpx_import` ou `gps_tracking`, LineString observée, distance
individuelle, empreinte/idempotence, état exploitable/refusé et provenance
technique. Une première contribution produit une LineString observée ; des
contributions supplémentaires produisent une `MultiLineString` de couverture,
jamais une route collective concaténée. `actions.preparation_data.observedCoverage`
est une projection recalculable qui expose le nombre de traces et leurs
distances individuelles, avec `coverageDistanceKm = null` tant qu'aucune
politique de dédoublonnage versionnée n'existe. Un polygone de parc ou de zone
close reste primaire et reçoit seulement cette couverture en complément.
La cible `routeTargetDistanceKm` reste une donnée de planification et ne devient
jamais la distance observée. Après promotion, une reconstruction ou un recalcul
ultérieur peut mettre à jour ses propres projections historiques, mais ne peut
pas réactiver sa géométrie comme représentation courante.

La distinction canonique est donc : `observé ≠ déclaré ≠ référence géographique
≠ reconstruit ≠ estimé`. `ActionGeometrySource` reste la source de vérité fine ;
la provenance qualité n'en est qu'une projection sémantique. La provenance
`ActionDataProvenance` des mesures n'est pas réutilisée pour qualifier une
géométrie.

L'import administrateur est un `BUSINESS_IMPORT`, pas une preuve d'ownership :
`importedBy`/l'acteur technique est conservé pour l'exécution et l'audit, mais
ne devient pas une ligne `action_organizers` par défaut. Si la source ne fournit
aucun organisateur métier identifiable, cette absence est conservée. Les droits
de créateur éventuels restent ceux du contrat explicite de la ressource ; ils ne
transforment pas l'acteur d'ingestion en organisateur et ne remplacent pas la
relation canonique `action_organizers`. Les allowlists `GRANTED_ROLE`, les
configurations d'admin et `service_role` ne sont pas des relations métier.

Une sauvegarde interne n'est pas une ingestion externe. Le format
`cleanmymap.action-backup` version 2 est un contrat
`DISASTER_RECOVERY_RESTORE` : `npm run restore:actions -w apps/web` valide le
format, les identités, la géométrie persistée et les relations action avant tout
plan d'écriture, puis appelle une restauration `service_role` atomique qui
préserve les identités et les champs historiques. Cette voie ne déclenche pas
`normalizeExternalActionImport` ni `createAction`, et ne doit pas être exposée
sous un nom `import`.

Le périmètre restauré couvre `actions`, `action_organizers`,
`action_registrations`, `action_participants`, `training_examples`, `forms`,
les conversations et exclusions d'action, ainsi que les demandes de partage
liées. Les messages et notifications génériques, la projection incrémentale d'Impact,
la ledger de prédiction et les objets Storage restent des projections ou
domaines externes : ils sont explicitement exclus du backup d'action ; la
projection d'Impact est recalculée par ses triggers lors de la restauration et
les autres domaines relèvent de l'archive Supabase générale. Un payload sans
version, incomplet ou incompatible est rejeté avant toute écriture ; le mode
plan est la valeur par défaut et `--apply` exige la confirmation explicite
documentée par la commande.

Les calculs de gouvernance et d'engagement distinguent systématiquement une
mesure observée de son absence. `NULL`/`NA` conserve la provenance et la
couverture; il ne devient zéro que lorsque la source complète établit
explicitement l'élément neutre de l'agrégation. Les seuils et poids non
triviaux ont un owner de policy versionné dans le module qui les consomme.
Les dates civiles `YYYY-MM-DD` ne sont pas des instants : tout adaptateur vers
`Date` doit déclarer sa timezone (`UTC` pour l'adaptateur générique, ou
`Europe/Paris` lorsque le contrat Actions l'exige) et ne doit jamais dépendre
de la timezone du processus.

Ne pas créer un nouveau chemin d'ingestion concurrent sans vérifier :

- contrat canonique ;
- déduplication ;
- provenance ;
- statut ;
- géométrie ;
- qualité ;
- date de collecte ;
- droits d'écriture.

## RLS et autorisation

Principe :

- authentification ≠ autorisation ;
- une session valide ne donne pas accès à toutes les lignes ;
- `service_role` reste serveur ;
- une dérogation admin doit être explicite et auditée si sensible.

Tester au minimum :

- anonyme ;
- connecté propriétaire ;
- connecté non-propriétaire ;
- rôle privilégié ;
- service role lorsque réellement requis.

Les lignes `public.missions` et `public.gps_points` sont des données
propriétaires sensibles. La lecture web de `/missions/[id]` est autorisée au
propriétaire porté par `missions.volunteer_id` et aux profils `admin`/`max`,
après AuthN puis décision d'AuthZ côté serveur. Les profils `elu` et les autres
profils ordinaires ne sont pas autorisés par analogie avec les actions.

Pour l'application mobile, les migrations
`apps/web/supabase/migrations/20260826070000_clerk_missions_gps_rls.sql` et
`apps/web/supabase/migrations/20260928000003_mobile_mission_insert_owner_rls.sql`
réalisent le contrat Clerk Third-Party Auth : `missions` est lisible et
modifiable par `authenticated` uniquement lorsque `volunteer_id` correspond au
claim Clerk `sub` non vide. La création mobile est limitée à une mission
`pending` appartenant au même `sub`, avec le seul insert `(volunteer_id,
label)`. Les points `gps_points` sont lisibles et insérables uniquement lorsque
la mission référencée appartient au même `sub`. Aucun accès ne découle de la
seule connaissance d'un `mission_id`, et un token sans `sub` est refusé.

Le grant INSERT mobile est limité à `volunteer_id` et `label`, tandis que le
grant UPDATE mobile est limité à `status`, `started_at` et `ended_at`.
`created_by`, `distance_m` et `duration_s` restent hors de la surface d'écriture
`authenticated` ; `volunteer_id` est fixé par l'insertion owner-scoped et n'est
pas modifiable ensuite. Le `service_role` conserve ses privilèges serveur sans
devenir une identité mobile.

La migration corrective
`apps/web/supabase/migrations/20260827100000_clerk_mission_completion_metrics_trigger.sql`
porte désormais la finalisation des métriques : le trigger
`finalize_completed_mission_metrics` s'exécute en `SECURITY INVOKER` lors du
passage à `completed`, lit uniquement les `gps_points` visibles selon les RLS
du propriétaire Clerk et écrit `distance_m`/`duration_s` dans `NEW`. Le client
mobile ne reçoit toujours aucun grant UPDATE direct sur les colonnes dérivées
et l'ancien RPC `compute_mission_distance` est supprimé.

`missions.created_by` est conservé comme provenance potentielle, pas comme
permission. Le `service_role` reste un moyen technique serveur uniquement ; il
ne remplace ni l'identité Clerk ni la décision d'ownership et ne doit jamais
être exposé au client. Les points GPS ne sont chargés qu'après une décision
d'accès positive et cette lecture ne passe pas par un cache partagé indexé par
mission.

Aucun partage public de mission ou de GPS n'est autorisé dans ce contrat. Toute
future surface publique devra reposer sur une vue sanitizée explicite et un
contrat distinct.

## Application mobile

Le LOT 1 de l'ADR-004 a supprimé l'identité Supabase Auth anonyme et établi
Clerk comme identité canonique de l'application mobile. Le LOT 2A a aligné les RLS de
`missions` et `gps_points` sur le claim Clerk `sub` et a borné les grants
UPDATE mobiles.

Restent explicitement hors production :

- RLS et contrat de synchronisation de `mission_actions` ;
- renouvellement fiable du token Clerk lors d'un réveil background headless ;
- usage opérationnel réel de l'application web et de l'application mobile ;
- l'application mobile est `CURRENT / ACTIVE DEVELOPMENT`, mais reste
  `NOT_PRODUCTION_READY` tant que ces limites ne sont pas validées.

Voir :

```txt
documentation/architecture/adr/ADR-004-companion-identity.md
```

## Évolution d'un contrat

Pour toute modification structurante :

1. identifier la source canonique ;
2. créer une migration si la base change ;
3. mettre à jour types et validateurs ;
4. adapter les appels ;
5. ajouter des tests de régression ;
6. mettre à jour la documentation ;
7. exécuter les checks adaptés.

Validation complète :

```bash
npm run checks
```
