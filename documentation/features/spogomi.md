# SPOGOMI — intégration événementielle et consolidation CleanMyMap

> **Statut : CURRENT PARTIEL — la préparation, la certification, les projections publiques bornées, les deux classements indépendants, la consolidation et l'export XLSX sont livrés sur les contrats explicitement présents dans le dépôt. Les preuves runtime externes et l'intégration partenaire restent à valider en environnement de validation.**
> Ce document ne prouve ni l'existence des tables et interfaces décrites, ni un partenariat contractualisé, ni la validation d'un règlement officiel SPOGOMI. Après chaque lot, ne passer en `CURRENT` que les comportements réellement livrés et testés.
>
> **Périmètre :** événements SPOGOMI organisés avec CleanMyMap, modes `casual`, `world_cup` et `mixed` (`Casual & World Cup`), inscriptions importées, équipes, mesures, classements par division, action canonique agrégée et participations confirmées.

## Création d’une édition — localisation et clôture

La création privée depuis `/spogomi/nouveau` réutilise la géolocalisation de
l’action CleanMyMap canonique. Le formulaire conserve un libellé de lieu pour
l’affichage, mais ne valide pas ce libellé seul : une adresse sélectionnée, un
lien Google Maps interprété ou un point choisi/déplacé sur la carte doit fournir
une paire WGS84 `latitude` / `longitude`. Cette paire est transmise à la
création de l’action unique liée à l’édition ; aucune seconde géolocalisation
SPOGOMI n’est créée.

Une nouvelle édition transmet `endsAt: null`. La colonne `ends_at` reste
nullable et continue d’être lue par les projections historiques et les
contrats de clôture ; aucune durée ni heure de fin n’est déduite au moment de
la création. L’empreinte d’idempotence inclut les coordonnées sélectionnées,
tandis que les empreintes historiques sans coordonnées restent reconnues pour
la reprise des éditions déjà persistées.

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
  des participants `registered`. La politique canonique de l’édition constitue
  la base et prévaut lorsqu’une même clé est également fournie par une
  division ; la capacité et le décompte sont toujours évalués dans la division
  concernée.
  En mode `mixed`, chaque division conserve son propre état et l’édition expose
  leur agrégation sans effacer la distinction ; sa structure attendue doit être
  complète avant l’ouverture.
- **résultats** : `unavailable`, `provisional`, `certified`, `published`.
  `certified` nécessite une projection de classement réellement exposable :
  toutes les équipes éligibles du classement concerné doivent être couvertes
  par des décisions officielles certifiées correspondant au snapshot courant.
  Les classements points et mégots restent indépendants, y compris en mode
  `mixed`. `published` exige en plus
  `public_visibility = published` et `public_results_visibility = certified`.
  Une politique de visibilité seule, un classement partiel, un snapshot
  obsolète, une date de fin ou une soumission sans classement officiel ne
  certifie ni ne publie un résultat ; `archived` ne constitue pas à lui seul
  un ensemble officiel publiable.

La projection non persistée est centralisée dans `public-service.ts` et la
projection canonique des résultats ; elle filtre toujours les éditions
privées, ne renvoie aucune donnée nominative et conserve les divisions Casual /
World Cup. Les éditions annulées restent absentes du catalogue public, mais une
édition publiée déjà annulée reste adressable directement par son slug et
affiche `cancelled` / `Annulée`, sans roster nominatif ni CTA d'inscription.
Les brouillons et éditions privées restent inaccessibles.

Le catalogue public `/spogomi` place les éditions à venir et en cours avant les
éditions terminées ; ces dernières sont triées par `starts_at` décroissant. Les
cartes distinguent le calendrier, les inscriptions, la disponibilité des
résultats et la provenance `published_event`. Une édition terminée sans
projection publique reste consultable mais affiche l'indisponibilité des
résultats. La démonstration Cachan est une destination séparée,
`/spogomi/demonstration/cachan`, alimentée uniquement par la fixture
`scenario_cachan_cleanmymap_mixed.json` et marquée `DEMONSTRATION / NON
OFFICIEL` ; elle ne rejoint aucune projection ou persistance SPOGOMI.

### Hiérarchie des prochaines actions sur une fiche

La fiche publique `/spogomi/[eventSlug]` conserve les destinations existantes.
Après l’en-tête, elle expose deux choix explicites : « Participer à la
compétition » et « Devenir arbitre ». Le premier reste ancré sur le parcours
sportif et le second sur la candidature individuelle de l’édition/division.
Le sélecteur complémentaire Bénévoles, Arbitres et Organisateurs reste
accessible pour les capacités historiques déjà attribuées. Le parcours
Bénévoles affiche les étapes issues de `SpogomiEventJourney` : une étape `later`
ou `indeterminate` n’est jamais transformée en CTA. Pendant l’épreuve, le quiz
reste donc absent ; après clôture, les résultats, contributions et attestations
disponibles sont prioritaires et aucune inscription n’est proposée. Pour une
édition `mixed`, Casual et World Cup sont sélectionnables publiquement et la
division est conservée dans les liens et retours Clerk. Les espaces privés
n’apparaissent que lorsqu’une projection serveur fournit l’habilitation
correspondante ; un parcours d’interface ne constitue une permission. La
projection serveur « Votre prochaine étape » reste unique et vient ensuite.
Elle est reconstruite à chaque requête depuis les demandes d'admission, les
preuves du quiz applicables à l'édition et à la division sélectionnée, la
révision courante du contrat d'inscription et la liaison de
participation, les preuves privées de contribution/attestation et les
habilitations événementielles du compte courant. Elle ne crée pas de table de
progression parallèle et toutes les lectures privées restent bornées à
`event_id` et au compte authentifié.

Les états d'affichage sont `À faire`, `En attente`, `Validée`, `Plus tard`,
`Accès requis` et `Indéterminé`. `Indéterminé` signale une preuve indisponible ;
il ne vaut ni refus ni autorisation. Avant une demande d'inscription, le quiz
et le règlement applicable de cette division sont prioritaires ; une preuve
issue d'une autre division ou d'une ancienne révision du contrat ne valide pas
la demande courante. Après un quiz réussi, la demande est prioritaire uniquement
si les inscriptions de la division sont ouvertes et que la readiness SQL
canonique est complète. Une demande en attente ou approuvée dans l'une ou
l'autre division ne réaffiche pas un CTA d'inscription ; une demande rejetée
ou annulée peut ouvrir une nouvelle demande si la readiness de l'édition et la
politique de la division sélectionnée l'autorisent. Pendant l'épreuve,
le parcours propose uniquement la régularisation de présence disponible dans
le formulaire, jamais un quiz d'inscription. Une admission approuvée oriente
vers la liaison de compte puis l'équipe, tandis qu'une participation liée met
en avant les informations pratiques. Après l'épreuve, les résultats, les
contributions et les attestations ne sont proposés que selon leurs preuves
respectives.

La division sélectionnée est une seule projection contextualisée : le paramètre
`division` de l'URL alimente le parcours serveur, les demandes affichées, le
quiz et le formulaire. Une nouvelle inscription n'est proposée que lorsque la
readiness SQL canonique et la politique autorisent l'inscription directe, sans
billetterie externe et, pour World Cup, avec l'autorisation dédiée. La division
sélectionnée reste consultable lorsqu'une demande active appartient à l'autre
division ; cette demande bloque une nouvelle inscription pour l'édition, sans
accorder de droit dans la division sélectionnée.

Les autres étapes restent visibles sous forme de lignes compactes avec leur
condition et leur destination. Les espaces organisateur et arbitre autorisés
sont présentés dans un bloc séparé, selon les capacités effectivement renvoyées
par les owners d'habilitation ; le cockpit existant n'est pas remplacé. La
proposition d'aide à l'organisation demeure distincte de l'inscription sportive
et ne participe pas à cette hiérarchie. Une session anonyme peut consulter la
fiche et ses informations publiques ; les étapes nécessitant un compte indiquent
`Accès requis` et redirigent vers la connexion sans divulguer d'état privé.

Les retours Clerk utilisent uniquement des routes internes construites par
`navigation-intent.ts`. Les paramètres publics facultatifs sont limités à une
intention d'interface allowlistée (`focus`) et à un type de division public
(`casual` ou `world_cup`) ; la fiche vérifie que la division appartient à
l'édition avant de l'utiliser. Le hash ramène l'utilisateur à l'ancre de
l'action demandée. Aucun code d'identité, secret, roster, tiers ou preuve
d'habilitation n'est placé dans `redirect_url`, et `resolveSafeAuthRedirect`
refuse les destinations externes, protocol-relative ou malformées.

Le chargement du catalogue mutualise les lectures publiques d'inscriptions et
d'organisateurs pour toutes les éditions de la requête. Une projection complète
des résultats reste dans son owner canonique lorsqu'une politique de résultats
est visible, car la publication doit être vérifiée par les snapshots sources ;
elle est évitée lorsque `public_results_visibility = hidden`, qui est déjà
indisponible publiquement. Le catalogue ne charge aucune donnée privée et son
tri reste effectué après projection : éditions à venir/en cours, puis terminées
par `starts_at` décroissant. Une pagination produit n'est pas ajoutée sans
mesure de croissance ou de coût démontrée ; la décision devra être réévaluée si
le volume public rend la projection complète mesurablement coûteuse.

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
- L'API, la préparation et le formulaire portent le mode `mixed` comme une édition privée avec deux divisions déterministes et une seule action parent. Le choix affiché est `Casual & World Cup`. Les onglets de gestion et les projections gardent les équipes, mesures, arbitrages et classements dans leur division.

### Déroulé UI de la démonstration Cachan

Le scénario synthétique `SPOGOMI Cachan, démonstration CleanMyMap — DEMONSTRATION / NON OFFICIEL` reste une fixture documentaire et n’est jamais une édition CleanMyMap créée en base. Le catalogue public propose un accès séparé, en lecture seule, vers `/spogomi/demonstration/cachan` ; cette route lit le manifeste historique et son extension additive de clôture synthétique, affiche la chronologie fictive, les compositions finales des deux divisions, les onze équipes, les deux classements indépendants et le bilan environnemental dérivé, sans fabriquer ni événement, ni action, ni résultat officiel, ni progression. La projection `apps/web/src/lib/spogomi/cachan-closure.ts` réutilise le moteur de scoring et conserve la distinction masse / nombre de mégots. Le parcours **Organisateurs** de la fiche publique conserve en parallèle son intention privée et n’est pas remplacé par cette démonstration.

Dans le cockpit, le sélecteur de divisions permet de parcourir séparément Casual et World Cup ; les catégories, équipes, saisies, décisions et classements sont chargés par les sections existantes et restent bornés par `division_id`. La carte de démonstration distingue les configurations persistées (règlement, politique de visibilité des résultats, visibilité de l’édition) des états constatés (composition verrouillée, préparation observée) et renvoie aux contrats de clôture pour les certifications, classements et blocages métier. Une politique « certifiés uniquement » ne constitue donc pas une preuve de certification, et une édition privée n’est pas présentée comme bloquée par principe. Un règlement fictif et un résultat synthétique ne deviennent jamais officiels par leur affichage.

Les mises à jour de métadonnées d’une édition existante passent par `spogomi_update_event_metadata` avec la révision de composition courante. Le mode parent est immuable tant qu’aucune procédure atomique de conversion n’est définie : une édition `casual` conserve exactement sa division `casual`, une édition `world_cup` sa division `world_cup`, et une édition `mixed` ses deux divisions. La migration corrective forward-only autorise la modification des autres métadonnées d’une édition déjà `mixed`, tout en refusant toute conversion de mode et en conservant les contrôles de verrouillage, d’autorisation et de concurrence.

Les projections de résultats publiques, le panneau d’arbitrage et le formulaire de saisie équipe relisent les correspondances environnementales persistées de la division, les convertissent vers le contrat métier unique et n’annoncent un score officiel que si le règlement complet, les coefficients confirmés et toutes les correspondances mappées satisfont la validation serveur. Une édition complète sans mapping confirmé reste donc explicitement indisponible à la certification, même si l’interface est consultable. La sauvegarde asynchrone du règlement conserve toute modification locale intervenue après son lancement et ne réconcilie entièrement le brouillon que lorsqu’aucune saisie plus récente n’existe ; la révision serveur reste contrôlée au prochain enregistrement.

Depuis `/spogomi`, l’accueil présente directement le déroulé d’une compétition,
les cartes Casual et World Cup, puis le catalogue et les informations
internationales. Le choix du parcours n’apparaît qu’après ouverture d’une fiche
d’édition. Les liens Bénévoles conservent la division sélectionnée ; les cartes
Arbitres et Organisateurs n’ouvrent une destination privée que lorsque la
projection serveur fournit une habilitation active pour cette édition. Un
visiteur peut demander une connexion pour vérifier son accès, sans qu’un lien ou
un parcours d’interface ne constitue une permission.

Le compte organisateur autorisé suffit pour parcourir la préparation, les équipes, les paramètres, l’arbitrage, le bilan et l’export lorsque les contrôles serveur les rendent disponibles. La saisie d’équipe exige une session d’équipe créée par le parcours existant ; la consultation personnelle exige un compte bénévole distinct ou une relation participant vérifiée. Les invitations, codes individuels et liens d’assistance restent contextuels et ne sont pas remplacés par le compte organisateur.

Le formulaire général de création propose `Casual`, `World Cup` et `Casual & World Cup`. La création reste privée, idempotente et protégée par le rôle actif `admin` ou `max`; l'API et le service revalident ce rôle indépendamment du parcours UI. Une création réussie retourne le slug de l'édition et ouvre son espace de préparation. Les preuves PostgreSQL et navigateur de la chaîne complète restent une exigence de validation, pas une raison de masquer un contrat déjà implémenté.

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

La capacité est exprimée par un entier positif représentable par PostgreSQL
(`1` à `2147483647`). Une chaîne décimale canonique telle que `"12"` est
normalisée en nombre par la frontière serveur ; les chaînes à zéros initiaux,
`0` et les valeurs hors plage sont refusées. La politique d'édition fournit les
valeurs héritées et la politique de division surcharge les mêmes clés ; cette
même projection et ce même comptage par division sont réutilisés par la checklist,
les demandes, les approbations et la fiche publique. Une capacité absente ou
explicitement nulle est illimitée ; une capacité présente mais invalide est
exposée comme invalide, rend la checklist incomplète et n'autorise jamais
l'inscription directe.

Chaque élément est affiché comme « Complet », « Incomplet » ou « Non vérifié »,
avec un lien vers la zone de préparation concernée.
spogomi_open_registration refuse une transition depuis draft tant que toutes
les conditions obligatoires de l'édition et de chaque division ne sont pas
complètes. La création directe d'une nouvelle demande recontrôle cette
projection côté serveur ; les demandes existantes, les participations déjà
enregistrées et les opérations administratives restent hors de ce verrou.

### Informations pratiques de la fiche publique

La fiche `/spogomi/[eventSlug]` compose un bloc compact à partir des mêmes
owners : date, lieu et fuseau de `spogomi_events`, horaires complets de
`spogomi_field_operations` par division, périmètre et point de rendez-vous de
la préparation publique de l'action liée, parcours `official_reference`, et
  matériel issu de la projection publique d'action. Le parcours prévu peut
  rester partagé pour l'historique ou être distinct par division ; ses sources
  sont explicitement versionnées (`official_reference`, `gpx_reference` ou
  `manual_reference`) et ne constituent jamais une trace observée. Une ligne d'horaires
incomplète ou rattachée à une division inconnue n'est pas affichée comme un
horaire officiel.

Les consignes de sécurité SPOGOMI, le contact public et la procédure
d'assistance issus de `registrationPolicy` ne sont rendus que lorsque leur
indicateur de vérification est vrai. Les consignes de sécurité de l'action
associée, lorsqu'elles sont publiques, sont affichées dans un champ et un
libellé de provenance distincts ; elles ne remplacent jamais une consigne
SPOGOMI vérifiée. Les informations absentes restent explicitement signalées
comme non communiquées. Les coordonnées ou consignes réservées aux participants
admis ne sont jamais chargées dans cette projection publique ;
aucune saisie ou référentiel événementiel parallèle n'est créé pour ce bloc.

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
sont facultatifs et n'entrent pas dans le score. Les choix utilisent des
identifiants génériques et un ordre stable pour une version donnée ; la
permutation serveur dépend de l'édition, de la division et de la question,
jamais des libellés ou de l'association correcte. La clé de correction reste
uniquement côté serveur et la définition publique ne la contient jamais.

`spogomi_submit_registration_quiz` vérifie les réponses côté serveur et
enregistre uniquement une preuve minimale liée au compte Clerk, à l'édition,
à la division, à `quiz_version` et à la révision du contrat d'inscription.
Une modification substantielle des sources produit une nouvelle version et
invalide les anciennes preuves pour les nouvelles demandes, sans modifier les
inscriptions déjà acceptées. Les soumissions réussies répétées restent
idempotentes pour cette combinaison complète.

Le gate final vit dans `create_spogomi_admission_request` et ne s'applique qu'à
`request_kind = registration`, après les contrôles d'authentification,
division, capacité, état, consentement et parcours officiel existants. Le
rattachement à une équipe importée (`team_join`) reste une opération de liaison
d'un participant déjà présent et conserve ses contrôles propres ; il ne crée
pas une nouvelle entrée sportive. Les consultations publiques, les demandes
déjà rejouables, les régularisations de présence, les opérations administratives
et les circuits externes non contrôlés par CleanMyMap ne sont pas verrouillés
par ce quiz.

### Candidature arbitre et qualification renforcée `CURRENT`

Le parcours « Devenir arbitre » est séparé de l’inscription sportive. Une
candidature est liée au compte Clerk, à l’édition et à la division ; elle ne
crée ni participant, ni équipe, ni place sportive et n’ajoute aucun rôle Clerk.
Les états sont `candidate` (candidature reçue, quiz à passer),
`theory_qualified`, `practical_pending`, `habilitated`, `refused` et `revoked`.
Les preuves et tentatives sont stockées dans les tables dédiées
`spogomi_referee_quiz_proofs` et `spogomi_referee_quiz_attempts`, jamais dans la
preuve du quiz participant.

Le quiz arbitre comporte vingt questions de mise en situation. Les questions
critiques couvrent notamment sécurité, accidents, déchets interdits, sanctions,
retard, périmètre, conflits, catégories, pesée, formulaire et publication ; les
autres couvrent horaires, unités, preuves, relais et scope. La définition
publique ne contient ni correction ni explication. Le serveur exige 100 % des
questions critiques et au moins 90 % des autres, conserve les corrections des
erreurs et limite les tentatives à dix par heure. La version du quiz et la
version du règlement de la division sont enregistrées avec la preuve ; une
version obsolète est refusée.

Une réussite théorique ne donne aucune capacité. La validation pratique est
une confirmation organisateur versionnée pour la pesée, le tri, les formulaires
et les consignes de sécurité. Une décision organisateur explicite est ensuite
requise avant l’état `habilitated`. La RPC d’attribution `referee` refuse toute
nouvelle attribution sans cette chaîne ; les habilitations historiques ne sont
pas révoquées rétroactivement. Toute révocation reste immédiate et auditée.
Les triggers et RPC empêchent également qu’un compte soit compétiteur et
arbitre actif de la même édition, y compris via une autre voie d’admission.

### Cycle de vie et changements substantiels

La matrice serveur `spogomi_admission_transition_allowed` est la référence des
demandes : une demande `pending` peut devenir `approved`, `rejected` ou
`cancelled`, puis son état terminal est immuable (un rejeu du même état reste
idempotent). Cette immutabilité est également contrôlée par le trigger SQL sur
toute mise à jour de la demande : une note, une date de décision, un acteur ou
un autre champ métier ne peut pas être réécrit après la décision ; une mise à
jour réellement sans effet reste sans effet. L'approbation `registration` crée ou réactive uniquement la ligne
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
existant. Les RPC server-only de préparation reçoivent l'identité Clerk déjà
vérifiée par la route organisateur et la posent uniquement dans un contexte
transactionnel local avant l'écriture. La modification de métadonnées passe
par une unique RPC `SECURITY INVOKER` ; aucune fonction privée déléguée ne reste
appelable séparément. L'historique conserve donc l'acteur réel, tandis que
`system` reste réservé aux écritures effectivement systémiques ou aux mutations
directes sans acteur applicatif.

Dans le parcours authentifié `/spogomi/mes-evenements`, le compte connecté
retrouve ces changements sous la fiche de l'édition lorsqu'il conserve une
relation participant enregistrée ou une demande d'équipe `pending`/`approved`.
Une demande active apparaît dans le catalogue général et dans le parcours
volontaires comme une relation de demandeur distincte : elle n'ajoute aucun
accès de gestion, d'arbitrage, d'opération ou de participation vérifiée.
La projection affiche uniquement la révision, les champs modifiés, la date,
l'obligation de confirmation et l'état de l'accusé ; les snapshots avant/après
ne sont jamais sélectionnés ni transmis au navigateur. Le bouton de confirmation
passe par la frontière serveur authentifiée et réutilise cette RPC avec l'identité
Clerk vérifiée ; une relation révoquée, un autre compte ou un autre événement ne
peut ni lire ni acquitter le changement.

### Proposition d'aide à l'organisation

La fiche publique d'une édition publiée et à venir propose, pour un compte
authentifié, un formulaire distinct de l'inscription sportive. Il collecte les
coordonnées de contact (nom, prénom et au moins un e-mail ou téléphone valide),
le type d'aide, les motivations, les compétences utiles et, facultativement,
l'expérience en cleanwalks. Le quiz sportif n'est pas requis.

La proposition est persistée dans `spogomi_volunteer_help_proposals`, liée au
`userId` Clerk et à `event_id`, avec les statuts `pending`, `accepted`,
`rejected` et `withdrawn`. Une clé d'idempotence rejoue la même soumission,
même après fermeture, annulation ou dépublication de l'édition ; si son contenu
diffère, le serveur renvoie un conflit explicite sans remplacer la première
proposition. Un verrou transactionnel empêche deux propositions actives du même
compte pour une édition. Aucun statut ne crée une participation, une mission certifiée, une
habilitation ou une inscription sportive ; aucun e-mail, message ou
notification n'est déclenché.

La lecture de suivi est limitée au compte demandeur. La file de traitement est
une projection privée réservée au créateur de l'édition ou à un
`action_organizers` effectivement relié à cette édition, recontrôlée par une
capability relationnelle dédiée de l'API et par la RPC PostgreSQL ; un rôle
global sans relation ne suffit pas. Elle
contient les coordonnées, motivations, compétences et expérience nécessaires au
traitement. Les événements, les données anonymes et les coordonnées ne sont
jamais projetés publiquement.

Le formulaire conserve la même clé d'idempotence tant que la réponse de
soumission n'est pas confirmée ; il renouvelle cette clé pour une nouvelle
proposition uniquement après succès. La RPC vérifie toujours
l'identité propriétaire avant tout rejeu terminal et renvoie au demandeur une
projection minimale sans coordonnées ni motivations.

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
