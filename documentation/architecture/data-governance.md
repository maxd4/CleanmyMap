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

Le runtime courant initialise, lors du passage à `post_action_complete`, les
comptes CleanMyMap correspondant au créateur et aux organisateurs comme
participations finales `confirmed`. Cette initialisation est distincte d'une
conversion automatique des inscriptions futures des autres utilisateurs.

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

État de vérification au 25 août 2026 : les contrats d'authentification et les
tests offline des flux canonical passent. Le smoke production authentifié a
ensuite été exécuté avec une session Clerk temporaire : `POST /api/spots` a
retourné `201`, la ligne `spot`/`new` a été retrouvée dans
`trash_spotter_spots`, l'événement `spot_create_pending` est resté à `0` XP,
aucun `points_ledger`, `xp_audit` ou notification de validation n'a été créé,
et le signalement est apparu dans les flux spots, actions unifiés et carte.
Le marker `CMM_PROD_SMOKE_1787677027552` et l'ID de signalement
`47bcd82a-aed2-45b3-a2e2-2e26f5cb0ab1` ont ensuite été nettoyés avec leurs
artefacts de progression ; aucune ligne ne subsiste dans la source canonical,
la table legacy ou `progression_events`. La session Clerk temporaire a été
révoquée. Le replay persistant local reste non exécuté, Docker et le runtime
Supabase local n'étant pas disponibles.

### Maintenance et opérations

Les outils d'opérations suivent la même séparation :

- `export-supabase-archive.mjs` archive `trash_spotter_spots`,
  `legacy_spot_migrations` et `spots`, ce dernier étant explicitement marqué
  comme archive legacy dans le manifeste ;
- `backfill-derived-geometry.mjs` cible par défaut `actions` et
  `trash_spotter_spots` uniquement ; il ne modifie jamais `spots` ;
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
invalide, une fin antérieure au début ou un créneau inférieur au temps
d’action est signalé comme incohérence ; aucune durée de passage à minuit,
valeur historique d’événement ou valeur fictive n’est reconstruite. Les
anciennes valeurs de `duration_minutes` restent intactes et représentent le
temps d’action déclaré. `estimatedDurationMinutes` dans d’anciens
`preparation_data` est lu uniquement pour compatibilité ; les nouveaux
formulaires n’enregistrent pas une seconde durée planifiée.

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

Pour l'application mobile, la migration
`apps/web/supabase/migrations/20260826070000_clerk_missions_gps_rls.sql`
réalise le contrat Clerk Third-Party Auth : `missions` est lisible et
modifiable par `authenticated` uniquement lorsque `volunteer_id` correspond au
claim Clerk `sub` non vide. Les points `gps_points` sont lisibles et insérables
uniquement lorsque la mission référencée appartient au même `sub`. Aucun accès
ne découle de la seule connaissance d'un `mission_id`, et un token sans `sub`
est refusé.

Le grant UPDATE mobile est limité à `status`, `started_at` et `ended_at`.
`volunteer_id`, `created_by`, `distance_m` et `duration_s` restent hors de la
surface d'écriture `authenticated`. Le `service_role` conserve ses privilèges
serveur sans devenir une identité mobile.

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
- l'application mobile est gelée à long terme jusqu'à une décision explicite de
  dégel.

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
