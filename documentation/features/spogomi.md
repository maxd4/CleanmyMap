# SPOGOMI — intégration événementielle et consolidation CleanMyMap

> **Statut : CURRENT PARTIEL — la préparation, la certification, les projections publiques bornées, les deux classements indépendants, la consolidation et l'export XLSX sont livrés sur les contrats explicitement présents dans le dépôt. Les preuves runtime externes et l'intégration partenaire restent à valider en environnement de validation.**
> Ce document ne prouve ni l'existence des tables et interfaces décrites, ni un partenariat contractualisé, ni la validation d'un règlement officiel SPOGOMI. Après chaque lot, ne passer en `CURRENT` que les comportements réellement livrés et testés.
>
> **Périmètre :** événements SPOGOMI organisés avec CleanMyMap, modes `casual`, `world_cup` et `mixed` (`Casual & World Cup`), inscriptions importées, équipes, mesures, classements par division, action canonique agrégée et participations confirmées.

## 1. Décision centrale

Une édition parentale SPOGOMI possède des données sportives par équipe, mais produit **une seule action environnementale canonique CleanMyMap**. Dans le schéma courant, `spogomi_events` est cette édition parente : `action_id` reste unique et aucune division ne crée une action supplémentaire.

Une édition possède une division `casual`, une division `world_cup`, ou les deux. Le mode parent `mixed` est valide uniquement avec exactement ces deux divisions distinctes. Les divisions portent un UUID stable, déterministe à partir de l’édition et de leur type ; une reprise identique réutilise les mêmes lignes.

### Projection CURRENT du cycle de vie

Le catalogue public et la fiche publique dérivent trois dimensions indépendantes
depuis les colonnes et projections existantes ; aucun état de cycle de vie
supplémentaire n'est persisté :

- **calendrier** : `upcoming`, `in_progress`, `finished`, `cancelled` ; les
  dates `timestamptz` sont comparées comme des instants et `cancelled` reste
  prioritaire. `postponed` n'est rendu que lorsqu'une preuve canonique future
  le permettra ; une date dépassée ou une politique de publication ne suffit
  jamais à le déduire ;
- **inscriptions** : `not_open`, `open`, `closed`, `capacity_reached`, dérivées
  de `spogomi_events.state`, de `registrationPolicy.capacity` et du décompte
  des participants `registered`. En mode `mixed`, chaque division conserve son
  propre état et l'édition expose leur agrégation sans effacer la distinction ;
- **résultats** : `unavailable`, `provisional`, `certified`, `published`.
  `certified` nécessite une preuve de classement officiel courant dans
  `spogomi_official_rankings` ; `published` exige en plus
  `public_visibility = published` et `public_results_visibility = certified`.
  Une politique de visibilité seule, une date de fin ou une soumission sans
  classement officiel ne certifie ni ne publie un résultat.

La projection non persistée est centralisée dans `public-service.ts` et la
projection canonique des résultats ; elle filtre toujours les éditions
privées, ne renvoie aucune donnée nominative et conserve les divisions Casual /
World Cup. Les éditions annulées restent absentes du catalogue public, comme
les brouillons et éditions privées ; la fiche publique conserve donc uniquement
les éditions publiées non annulées.

Le catalogue public `/spogomi` place les éditions à venir et en cours avant les
éditions terminées ; ces dernières sont triées par `starts_at` décroissant. Les
cartes distinguent le calendrier, les inscriptions, la disponibilité des
résultats et la provenance `published_event`. Une édition terminée sans
projection publique reste consultable mais affiche l'indisponibilité des
résultats. La démonstration Cachan est une destination séparée,
`/spogomi/demonstration/cachan`, alimentée uniquement par la fixture
`scenario_cachan_cleanmymap_mixed.json` et marquée `DEMONSTRATION / NON
OFFICIEL` ; elle ne rejoint aucune projection ou persistance SPOGOMI.

```text
Édition parente SPOGOMI (casual | world_cup | mixed)
  ├── Division(s) typée(s) (casual et/ou world_cup)
  │     ├── Places importées, uniques au parent et affectées explicitement
  │     ├── Équipes et membres
  │     ├── Règlement, catégories et mesures
  │     ├── Soumissions, certifications et classement séparés
  │     └── Parcours GPX de référence si fourni
  └── Une seule action CleanMyMap liée au parent
        └── Formulaires SPOGOMI dédiés par équipe
        └── Soumissions, arbitrage, mesures physiques et points sportifs
               │
               ▼
       Consolidation environnementale validée
               │   une seule liaison event → action
               ▼
       Action canonique CleanMyMap
         ├── bilan et géométrie de référence
         ├── carte, statistiques et rapports
         └── action_participants.confirmed (comptes Clerk éligibles)
                       └── gamification CleanMyMap existante
```

### Contrat canonique des divisions

- `spogomi_divisions(event_id, division_type)` est la source de vérité des divisions ; `division_type` vaut uniquement `casual` ou `world_cup`.
- Les tables d’équipes, affectations, règlements/catégories, mesures, soumissions, certifications, accès, audits, attestations et classements portent `division_id` et des clés étrangères composites avec `event_id`. Une référence entre deux divisions d’une même édition est donc rejetée par PostgreSQL.
- Les participants restent une seule ligne au niveau parent (`event_id`, `external_reference`) et doivent recevoir une affectation explicite à une division et, le cas échéant, à une équipe. Une édition `mixed` ne peut jamais déduire une division depuis le parent.
- Les éditions existantes sont conservées sans réinterprétation : chaque ancien `casual` ou `world_cup` reçoit une seule division de même type, avec un identifiant stable. Le mécanisme de compatibilité ne résout automatiquement une valeur absente que lorsqu’une seule division existe ; il échoue fermé pour une édition mixte.
- `spogomi_ensure_parent_divisions` verrouille l’édition et effectue les insertions idempotentes dans une transaction. La clé d’idempotence existante continue de protéger la reprise de l’action et de l’édition ; aucune reprise ne crée une seconde action, division ou équipe.
- Les verrous de composition, règlements, certifications et classements restent portés par les procédures serveur et s’appliquent dans le périmètre d’une division. Le rôle HTTP conserve l’AuthN/AuthZ ; Supabase RLS et les grants ne sont pas élargis aux écritures client.
- L'API et la préparation savent porter le mode `mixed` comme une édition privée avec deux divisions déterministes et une seule action parent ; le choix `Casual & World Cup` reste masqué dans le formulaire tant que les preuves PostgreSQL et navigateur de la chaîne complète ne sont pas réunies. Les onglets de gestion et les projections gardent les équipes, mesures, arbitrages et classements dans leur division.

### Déroulé UI de la démonstration Cachan

Le scénario synthétique `SPOGOMI Cachan, démonstration CleanMyMap — DEMONSTRATION / NON OFFICIEL` reste une fixture documentaire et n’est jamais une édition CleanMyMap créée en base. Le catalogue public propose un accès séparé, en lecture seule, vers `/spogomi/demonstration/cachan` ; cette route lit la fixture canonique, affiche ses deux divisions et ses onze équipes, et ne fabrique ni événement, ni action, ni résultat officiel, ni statistique environnementale, ni progression. L’onglet **Organisateurs** conserve en parallèle son intention privée et n’est pas remplacé par cette démonstration.

Dans le cockpit, le sélecteur de divisions permet de parcourir séparément Casual et World Cup ; les catégories, équipes, saisies, décisions et classements sont chargés par les sections existantes et restent bornés par `division_id`. La carte de démonstration distingue les configurations persistées (règlement, politique de visibilité des résultats, visibilité de l’édition) des états constatés (composition verrouillée, préparation observée) et renvoie aux contrats de clôture pour les certifications, classements et blocages métier. Une politique « certifiés uniquement » ne constitue donc pas une preuve de certification, et une édition privée n’est pas présentée comme bloquée par principe. Un règlement fictif et un résultat synthétique ne deviennent jamais officiels par leur affichage.

Les mises à jour de métadonnées d’une édition existante passent par `spogomi_update_event_metadata` avec la révision de composition courante. Le mode parent est immuable tant qu’aucune procédure atomique de conversion n’est définie : une édition `casual` conserve exactement sa division `casual`, une édition `world_cup` sa division `world_cup`, et une édition `mixed` ses deux divisions. La migration corrective forward-only autorise la modification des autres métadonnées d’une édition déjà `mixed`, tout en refusant toute conversion de mode et en conservant les contrôles de verrouillage, d’autorisation et de concurrence.

Les projections de résultats publiques, le panneau d’arbitrage et le formulaire de saisie équipe relisent les correspondances environnementales persistées de la division, les convertissent vers le contrat métier unique et n’annoncent un score officiel que si le règlement complet, les coefficients confirmés et toutes les correspondances mappées satisfont la validation serveur. Une édition complète sans mapping confirmé reste donc explicitement indisponible à la certification, même si l’interface est consultable. La sauvegarde asynchrone du règlement conserve toute modification locale intervenue après son lancement et ne réconcilie entièrement le brouillon que lorsqu’aucune saisie plus récente n’existe ; la révision serveur reste contrôlée au prochain enregistrement.

Depuis `/spogomi`, les trois onglets restent utilisables avant authentification : les actions publiques aboutissent à la découverte ou à une explication contextualisée, tandis que les actions privées conservent leur intention dans Clerk puis ouvrent `/spogomi/mes-evenements` et la section autorisée de l’espace événementiel. Un participant multirôle conserve le parcours bénévole lorsqu’il le choisit ; aucune entrée privée n’est remplacée par un cockpit organisateur.

Le compte organisateur autorisé suffit pour parcourir la préparation, les équipes, les paramètres, l’arbitrage, le bilan et l’export lorsque les contrôles serveur les rendent disponibles. La saisie d’équipe exige une session d’équipe créée par le parcours existant ; la consultation personnelle exige un compte bénévole distinct ou une relation participant vérifiée. Les invitations, codes individuels et liens d’assistance restent contextuels et ne sont pas remplacés par le compte organisateur.

Le formulaire général de création continue de masquer `mixed`. Tant que le scénario n’a pas obtenu ses preuves PostgreSQL éphémère et navigateur exigées par le contrat d’intégration, seule l’édition de validation préconfigurée peut porter ce mode ; elle n’est jamais créée, publiée ou certifiée depuis un CTA UI.

**Frontières non négociables :**

- Le formulaire SPOGOMI par équipe n'est ni le formulaire générique des bénévoles ni `public.forms` ; cette dernière table a déjà des consommateurs de gamification.
- Les résultats sportifs ne sont pas de l'XP CleanMyMap. Les deux classements et les deux mécaniques sont indépendants.
- Une seule action `actions.id` représente la collecte collective sur la carte et dans les statistiques : aucune action par équipe, aucune action supplémentaire lors d'un recalcul.
- Les données détaillées de compétition ont leur propriétaire SPOGOMI ; la table `actions` reçoit une **projection** du bilan physique validé, pas une nouvelle saisie indépendante.
- La projection doit pouvoir être reconstruite et sa provenance vérifiée. Un changement de résultat ne s'ajoute jamais au bilan existant : il le remplace après nouvelle validation.

### Préparation à l'ouverture des inscriptions

L'ouverture des inscriptions libre-service est une transition serveur
revisionnée, distincte de la publication de la fiche. La fiche informative peut
être publiée avant d'être complète ; elle ne permet pas pour autant de créer
une nouvelle demande d'inscription.

La RPC spogomi_registration_readiness centralise la checklist par édition et
par division. Elle réutilise la version et l'état du règlement, les catégories
et barèmes, les horaires de spogomi_field_operations, le parcours de
spogomi_event_routes, le lieu de l'édition, la capacité de
registrationPolicy et les conditions d'éligibilité existantes. Les seules
informations complémentaires persistées dans registrationPolicy sont les
consignes de sécurité, le contact d'organisation, la procédure d'assistance et
la déclaration d'applicabilité des mineurs avec leurs indicateurs de
vérification.

Chaque élément est affiché comme « Complet », « Incomplet » ou « Non vérifié »,
avec un lien vers la zone de préparation concernée.
spogomi_open_registration refuse une transition depuis draft tant que toutes
les conditions obligatoires de l'édition et de chaque division ne sont pas
complètes. La création directe d'une nouvelle demande recontrôle cette
projection côté serveur ; les demandes existantes, les participations déjà
enregistrées et les opérations administratives restent hors de ce verrou.

### Quiz pédagogique obligatoire avant inscription

Une nouvelle demande `registration` envoyée par CleanMyMap doit disposer d'une
preuve serveur de réussite du quiz applicable à son `eventId`, sa division et
sa version effective du règlement. `spogomi_registration_quiz` produit une
projection contextualisée à partir des données publiées et vérifiées de
l'édition : horaires et déroulement, sécurité/déplacements/déchets interdits,
tri/pesée/catégories/barèmes, conditions réglementaires et mineurs, parcours
CleanMyMap, contact et assistance. Une information absente ou non vérifiée est
retournée dans `missing` ; aucune généralité japonaise ou ARTEMA ne remplace la
source de l'édition.

Le questionnaire exige toutes les réponses correctes aux questions critiques et
80 % au minimum sur les autres. Les tentatives sont illimitées et les erreurs
sont expliquées. La question sur l'expérience de cleanwalk et son commentaire
sont facultatifs et n'entrent pas dans le score. La définition publique ne
contient jamais les réponses correctes.

`spogomi_submit_registration_quiz` vérifie les réponses côté serveur et
enregistre uniquement une preuve minimale liée au compte Clerk, à l'édition,
à la division et à `quiz_version`. Une modification substantielle des sources
produit une nouvelle version et invalide les anciennes preuves pour les
nouvelles demandes, sans modifier les inscriptions déjà acceptées.

Le gate final vit dans `create_spogomi_admission_request` et ne s'applique qu'à
`request_kind = registration`, après les contrôles d'authentification,
division, capacité, état, consentement et parcours officiel existants. Le
rattachement à une équipe importée (`team_join`) reste une opération de liaison
d'un participant déjà présent et conserve ses contrôles propres ; il ne crée
pas une nouvelle entrée sportive. Les consultations publiques, les demandes
déjà rejouables, les régularisations de présence, les opérations administratives
et les circuits externes non contrôlés par CleanMyMap ne sont pas verrouillés
par ce quiz.

### Cycle de vie et changements substantiels

La matrice serveur `spogomi_admission_transition_allowed` est la référence des
demandes : une demande `pending` peut devenir `approved`, `rejected` ou
`cancelled`, puis son état terminal est immuable (un rejeu du même état reste
idempotent). L'approbation `registration` crée ou réactive uniquement la ligne
du compte dans la division demandée ; l'approbation `team_join` vérifie et lie
une ligne de roster existante ; `presence_regularization` ne crée aucun
participant. Une nouvelle demande `registration` ne peut être créée qu'après
un désistement d'une inscription directe et la validation d'un nouveau quiz.
Les imports organisateur et les invitations anticipées conservent leur source
et leur propriétaire ; ils ne passent pas par une seconde inscription.

Le désistement authentifié passe par `withdraw_spogomi_participant` et conserve
la trace append-only dans `spogomi_participant_lifecycle_events`. Une
réinscription directe réutilise cette même ligne uniquement si elle est
`withdrawn`, issue de `direct_registration` et dans la même division ; un
participant importé ou déjà `registered` n'est jamais dupliqué ni réactivé par
ce parcours.

Les changements de date, lieu, règlement, éligibilité, mode ou bornes d'équipe
font progresser `registration_contract_revision` et sont enregistrés dans
`spogomi_event_change_history`. Les preuves du quiz portent cette révision :
elles deviennent obsolètes pour les nouvelles demandes, tandis que les
admissions déjà approuvées et les participants existants restent inchangés.
Les participants enregistrés et demandeurs actifs reçoivent une notification
privée idempotente indiquant les champs concernés et si une confirmation est
requise. La confirmation explicite est disponible par
`acknowledge_spogomi_event_change` uniquement pour les comptes concernés ; elle
ne transforme jamais une notification en admission et n'annule aucun droit
existant.

### Proposition d'aide à l'organisation

La fiche publique d'une édition publiée et à venir propose, pour un compte
authentifié, un formulaire distinct de l'inscription sportive. Il collecte les
coordonnées de contact (nom, prénom et au moins un e-mail ou téléphone valide),
le type d'aide, les motivations, les compétences utiles et, facultativement,
l'expérience en cleanwalks. Le quiz sportif n'est pas requis.

La proposition est persistée dans `spogomi_volunteer_help_proposals`, liée au
`userId` Clerk et à `event_id`, avec les statuts `pending`, `accepted`,
`rejected` et `withdrawn`. Une clé d'idempotence rejoue la même soumission et
un verrou transactionnel empêche deux propositions actives du même compte pour
une édition. Aucun statut ne crée une participation, une mission certifiée, une
habilitation ou une inscription sportive ; aucun e-mail, message ou
notification n'est déclenché.

La lecture de suivi est limitée au compte demandeur. La file de traitement est
une projection privée réservée à l'organisateur/coorganisateur réellement
habilité de cette édition, recontrôlée par l'API et la RPC PostgreSQL ; elle
contient les coordonnées, motivations, compétences et expérience nécessaires au
traitement. Les événements, les données anonymes et les coordonnées ne sont
jamais projetés publiquement.

La table et son historique sont service-only sous RLS. Les contrôles serveur
refusent une édition non publiée, annulée, archivée ou dont la date de début est
passée. Les soumissions sont limitées par compte authentifié et rate limiting ;
un honeypot et une validation serveur complètent l'anti-spam. La durée maximale
configurée est de 24 mois après la création, puis après la dernière décision via
`retention_until`. Cette colonne rend l'éligibilité à la suppression vérifiable;
le dépôt ne prétend pas qu'un job de purge est planifié. Les demandes d'accès,
rectification et suppression passent par le contact RGPD existant.

## Index des modules

- [Données, import et règlements](./spogomi-donnees-regles.md)
- [Accès, identités et surfaces](./spogomi-acces-surfaces.md)
- [Préparation et imports](./spogomi-preparation-imports.md)
- [Certification et consolidation](./spogomi-certification-consolidation.md)
- [Règlement externe et questions ouvertes](./spogomi-reglement-plan.md)
- [Gamification et publications](./spogomi-gamification-publication.md)
- [Cockpit et exploitation](./spogomi-exploitation.md)

Les règles sportives non validées ne deviennent pas un règlement officiel.
