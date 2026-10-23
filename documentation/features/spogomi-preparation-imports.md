# Préparation et imports

> Module associé à [spogomi.md](./spogomi.md). Statut : lots CURRENT.

## 14. Lot 1 livré — CURRENT

Le lot 1 implémente uniquement le socle métier et ses frontières de sécurité :

- `apps/web/src/lib/spogomi/` porte les types et fonctions pures pour les modes,
  la composition des équipes, la séparation inscription/présence/compte,
  les catégories mesurées et le blocage d'une certification avec règlement
  incomplet ; aucun barème numérique n'est codé en dur ;
- `apps/web/supabase/migrations/20261012000001_spogomi_foundation.sql` ajoute
  les tables `spogomi_events`, `spogomi_teams`, `spogomi_participants`,
  `spogomi_category_rules`, `spogomi_result_submissions`,
  `spogomi_result_items` et `spogomi_result_reviews` ;
- le lien événement → action est unique, les versions de soumission et les
  décisions de certification/correction sont traçables, et l'équipe référence
  explicitement sa soumission certifiée courante ;
- les données du roster restent server-only ; les lectures authentifiées
  autorisées des autres entités passent par `action_organizers`, tandis que les
  écritures attendent une AuthZ serveur existante avant le client privilégié ;
- il n'y a ni interface publique d'événement, ni projection de résultats,
  ni classement, ni attribution de gamification dans ce lot de socle. La
  préparation privée livrée au lot 2 est décrite ci-dessous ; le reste reste
  dans le plan des lots suivants.

Cette section `CURRENT` ne remplace pas le contrat `PLAN` précédent : elle ne
déclare livrées que les frontières et invariants effectivement introduits par
le lot 1.

Chaque lot s'appuie sur le `main` **publié** du lot précédent. Codex exécute les tests adaptés et n'annonce ni preuve de production ni migration distante sans observation réelle. Les validations et commits suivent la gouvernance du dépôt et `documentation/development/TESTING.md`.

## 15. Lot 2 livré — CURRENT — préparation organisateur

La préparation privée est désormais portée par `/spogomi/[eventSlug]/espace` et permet
à un compte authentifié qui possède la relation organisateur canonique de :

- créer un brouillon avec une seule action CleanMyMap liée par `action_id` ; la
  réservation serveur, l'empreinte des paramètres et le lease de reprise de
  `spogomi_event_creation_attempts` empêchent une double création concurrente,
  vérifient le propriétaire et permettent de reprendre un échec de liaison sans
  créer une seconde action (`PARTIAL_ALLOWED`) ; le type juridique SPOGOMI
  France reste provisoire tant que le répertoire ne le configure pas ;
- créer depuis `/spogomi/nouveau` avec une clé et un payload conservés pour
  la même intention lors d'une réponse réseau indéterminée ; le formulaire ne
  se réinitialise et le cockpit ne se rafraîchit qu'après confirmation du
  serveur ; le catalogue ordinaire part des créations et des relations
  `action_organizers`, déduplique les événements puis applique `canManageEvent`,
  tandis que le catalogue global `ACTIVE_ROLE=admin|max` reste paginé ;
- la création ne choisit pas la taille des équipes : une intention nouvelle ne
  transporte aucun `casualTeamSize` et initialise la configuration réglementaire
  vide ; les bornes nécessaires sont définies dans la préparation avant la
  composition. Les tentatives historiques qui contiennent encore cette donnée
  restent reprenables avec leur même clé : l'ancienne empreinte est reconstruite
  dans son ordre canonique, uniquement pour `null` ou une valeur entière de `1`
  à `20`. Une empreinte complète portée par la tentative ou l'action est exigée ;
  des dates, un lieu, un nom ou une clé seuls ne constituent jamais une preuve.
  La taille historique prouvée ne restaure une configuration que lors de la
  première création de l'événement ; une configuration déjà existante, même
  modifiée depuis, n'est jamais réinterprétée ni écrasée. La normalisation vers
  l'empreinte courante reste protégée par le prédicat de concurrence de la
  tentative et le lease de reprise ;
- les dates de création viennent exclusivement de la saisie : une date passée,
  future ou une période qui traverse le présent est valide si les dates sont
  interprétables et que la fin, lorsqu'elle existe, n'est pas antérieure au
  début. Aucune période courante supposée n'est injectée par défaut ; une
  création reste privée jusqu'à sa publication explicite ;
- déposer un CSV, TSV, XLSX, XLS ou ODS de roster privé, sélectionner
  explicitement la feuille, la ligne d'en-tête et les correspondances ambiguës,
  voir l'encodage, les inconnues, erreurs, conflits et doublons probables, puis
  confirmer un import idempotent par empreinte de contenu après nouvelle lecture
  serveur du fichier brut et de la correspondance choisie ; les insertions de
  participants sont protégées par un lease, vérifiées exhaustivement par pages
  ordonnées (sans dépendre de la limite Supabase par défaut), comparées par
  numéro de ligne et empreinte, et reprenables après un état partiel ou échoué.
  Un import incomplet ne passe jamais à `confirmed`. Aucun compte Clerk,
  `action_registrations` ou `action_participants` canonique n'est créé par ce
  parcours ;
- former automatiquement les équipes selon un ordre déterministe, préserver les
  groupes autant que possible, laisser les impossibles dans « À affecter »,
  déplacer manuellement une personne et verrouiller seulement une composition
  conforme ; cette première surface est complétée par le contrat du lot 11
  ci-dessous ;
- importer un GPX officiel en réutilisant `parseGpxFile`. Le parcours est stocké
  dans `spogomi_event_routes` avec la provenance `official_reference` et une
  distance de référence ; il n'est jamais présenté comme une distance observée.

Le roster nominatif, les correspondances et les mutations restent derrière une
AuthN/AuthZ serveur ; les API utilisent le client privilégié uniquement après
le contrôle d'accès métier. Cette livraison ne fournit ni interface publique,
ni règlement complet, ni score, ni consolidation finale.

Fichiers principaux :

- `apps/web/src/lib/spogomi/preparation.ts` et
  `apps/web/src/lib/spogomi/preparation-service.ts` ;
- `apps/web/src/components/spogomi/` et `apps/web/src/app/(app)/spogomi/` ;
- `apps/web/src/app/api/spogomi/` ;
- `apps/web/supabase/migrations/20261012000002_spogomi_preparation.sql`.

## 18. Lot 11 livré — CURRENT — billetterie par place et composition sûre

Le cockpit organisateur accepte désormais le mapping synthétique de billetterie
Cachan Weezevent : chaque `N. Billet` devient une place distincte, chaque `N. de commande`
reste un regroupement privé, et l'absence de nom devient l'état explicite
« place à identifier ». Les doublons d'acheteur ne fusionnent donc jamais des
places. Les statuts et suppressions sont conservés comme état de billet ; une
place annulée est marquée comme telle sans être supprimée. Si une présence,
une identité, une liaison ou une décision de participation existe déjà, le
réimport signale un conflit et ne révoque pas cette décision.

Les références externes de place sont stables pour les réimports et uniques dans
le couple événement/source. `N. de commande avancé` est conservé comme référence
de contrôle, sans devenir une clé d'identité. Un réimport identique est idempotent ;
un changement de statut, de commande, de référence avancée ou d'identité est
signalé et ajouté à l'historique privé. Une collision de référence dans un fichier
est bloquante. Le roster, ses correspondances et son historique restent
server-only, sans donnée de billetterie réelle dans le dépôt.

Les champs `ticket_status` et `ticket_deleted` restent la source commerciale
canonique. Une annulation ou suppression sans décision terrain protégée fait
passer la place à `withdrawn`, sans effacer son identité, son UUID ou son
historique ; une réactivation vérifiée peut la rendre `registered`. Une
annulation qui rencontre une identité confirmée, une présence attestée, une
liaison Clerk, une affectation ou une autre décision sportive est conservée
comme conflit explicite. Tant que ce conflit n'est pas arbitré, la place ne peut
pas être traitée comme active par une nouvelle composition.

Après le verrouillage de la composition, une nouvelle place Weezevent peut être
historisée mais reste retirée de la composition admissible et porte un conflit
requérant un arbitrage versionné. Les réimports d'une place connue conservent
ses décisions et ne peuvent pas modifier son éligibilité sportive après le
verrouillage. Les règles `mode` et `team_size_config` sont également protégées
par une révision transactionnelle ; une mise à jour de nom, lieu, dates ou
visibilité réutilise exactement les bornes Casual existantes.

La formation propose d'abord les trios conservés par commande/groupe, puis
recompose les restes avec priorité aux trios et aux décompositions `5 → 3 + 2`
et `6 → 3 + 3`. World Cup exige exactement trois membres par équipe ; Casual
utilise exclusivement les bornes configurées pour l'événement. L'aperçu expose
les équipes proposées, les places en attente, les raisons et l'empreinte de
révision. La confirmation exige cette empreinte et passe par une transaction
server-only verrouillant l'événement ; les équipes existantes sont réutilisées
par leur numéro et ne sont jamais supprimées/recréées silencieusement. Les
accès, résultats et historiques restent ainsi attachés à leurs identifiants.

Les migrations `20261012000022_spogomi_ticket_roster_and_team_composition.sql`,
`20261013000001_spogomi_ticket_source_scope_and_safe_rebalance.sql`,
`20261013000002_spogomi_import_history_and_safe_reconciliation.sql` et
`20261013000003_spogomi_composition_lock_integrity.sql` et
`20261013000004_spogomi_ticket_reconciliation_atomicity.sql` ajoutent
les états de billetterie, l'historique des changements, la révision de composition,
la portée source de la clé de billet, la preuve append-only de chaque ligne
d'import et la RPC atomique de confirmation. La réconciliation des lignes Cachan
est désormais transactionnelle : participants, changements et preuves de lignes
réussissent ou échouent ensemble, avec verrou événementiel et reprise idempotente.
La transition distingue aussi les imports confirmés avant la preuve détaillée
(`legacy_unavailable`) des imports récents réellement incomplets, sans fabriquer
de snapshot historique. La seconde bloque la recomposition
automatique d'une équipe déjà liée à un accès ou à des résultats via
`20261013000003_spogomi_composition_lock_integrity.sql` ; `20261013000002`
rend les réimports historiques indépendants de la provenance courante et limite
la réconciliation aux champs possédés par la billetterie. L'aperçu des équipes
refuse explicitement les annulations protégées, affiche chaque place, permet les déplacements sans écriture puis confirme
exactement la proposition contrôlée côté serveur. Un dry-run ne vaut pas preuve
d'application distante ; la certification, la consolidation, AuthN/AuthZ, RLS et
la liaison Clerk restent inchangées.

### Préparation opérationnelle et accueil — CURRENT

Le cockpit événementiel conserve une distinction stricte entre la fiche publiable
et la préparation privée du jour J. La préparation privée regroupe, par division,
le statut et la source du règlement, les catégories et unités, les équipes, les
places non affectées, l’état de verrouillage, les informations pratiques, le
parcours officiel lorsqu’il existe et les habilitations de l’édition. Une
publication d’annonce n’exige pas que les compositions soient déjà terminées ;
une composition provisoire ne peut toutefois pas être présentée comme officielle
et une certification reste soumise au règlement complet.

L’accès `checkin` est attribué et révoqué par l’organisateur dans
`spogomi_event_reviewers` pour une seule édition. Il ne s’agit pas d’un rôle Clerk
global. La projection « Accueil et présences » est privée, paginée et limitée à
la place, l’identité roster nécessaire, l’équipe et `attendance_status` ; elle
n’accorde ni export nominatif complet, ni configuration du règlement, ni
certification. Un compte Clerk n’est pas requis pour le participant pointé.

`attendance_status` reste la valeur courante canonique (`unknown`, `present`,
`absent`). Chaque changement effectif passe par
`spogomi_set_attendance_status`, qui verrouille l’événement et le participant,
contrôle la révision optionnelle `updated_at`, écrit l’acteur, le motif et la
provenance dans `spogomi_attendance_audit`, et rend une répétition idempotente.
Une absence, une arrivée tardive, une identité non résolue ou une demande de
remplacement ne supprime pas l’inscription et ne modifie pas silencieusement la
composition officielle ; après verrouillage, la route ordinaire de déplacement
reste refusée. En cas de réseau indisponible, seule une feuille ou un export
privé minimal suivi d’une ressaisie contrôlée est prévu : aucune synchronisation
hors ligne automatique n’est prétendue.

### Verrouillage effectif des compositions

Les déplacements ordinaires passent par la RPC server-only
`spogomi_move_participant_to_team` et restent limités aux états `draft` et
`registration_open`. La RPC contrôle la révision courante, vérifie les deux
équipes concernées et refuse toute équipe verrouillée, vérifiée, porteuse d'un
accès, d'une soumission, d'un résultat certifié ou d'un historique de
composition. Une tentative après le démarrage, pendant le jugement, après
certification ou après archivage indique explicitement qu'une procédure
d'absence/remplacement versionnée et auditée est requise ; `teams/move` ne peut
pas servir de contournement.

Le verrouillage est porté par `spogomi_lock_team_composition`, qui verrouille
l'événement, valide les effectifs puis les équipes et l'état de l'événement
dans une même transaction contrôlée par `composition_revision`. Des triggers
refusent aussi les mises à jour directes de `team_id`, de
`composition_state` ou de l'état `composition_locked` hors de ces procédures.
L'audit append-only des déplacements et verrouillages conserve l'acteur et la
révision sans modifier les UUID, numéros, pseudonymes, accès ou résultats.

La migration `20261013000003_spogomi_composition_lock_integrity.sql` est
forward-only et n'a pas été appliquée à distance par ce lot.

### Concurrence de préparation et synchronisation GPX

Les mutations de préparation qui peuvent modifier l'effectif ou l'état de la
composition se sérialisent sur la ligne courante de `spogomi_events`. Les RPC
de proposition/confirmation, déplacement et verrouillage contrôlent la
`composition_revision` après acquisition de ce verrou ; le trigger de cycle de
vie des places l'acquiert également avant d'autoriser une insertion ou une
modification commerciale. Ainsi, une importation concurrente est soit observée
par le verrouillage, soit refusée comme ajout post-verrouillage : elle ne peut
pas produire une composition officiellement partielle.

L'attachement du GPX officiel passe par
`spogomi_attach_official_gpx`. La route `spogomi_event_routes` et la référence
`spogomiOfficialReference` de l'Action sont écrites dans la même transaction,
après verrouillage de l'événement puis de l'Action. La mise à jour utilise
`jsonb_set` et ne remplace donc pas les autres métadonnées de préparation ; une
révision concurrente obsolète est rejetée. Le changement reste limité au
parcours officiel et ne touche ni la certification publiée dans la migration
`20261012000021_spogomi_certificate_reissue_concurrency.sql`, ni les
projections de compétition.

La migration `20261013000009_spogomi_preparation_concurrency.sql` est
forward-only. La CI Supabase éphémère exécute les tests métier ciblés puis un
scénario PostgreSQL réel avec deux clients/sessions couvrant confirmation
concurrente, déplacement/verrouillage, synchronisation GPX/Action et la
réémission de certificat déjà implémentée. Les tests mockés ne sont pas une
preuve de sémantique PostgreSQL ; hors environnement CI éphémère autorisé,
`DB_SEMANTICS_NOT_EXECUTED` doit être conservé.

### Pseudonymes publics des équipes — Lot 11C

Le pseudonyme public d'une équipe reste porté par `spogomi_teams.public_name`.
Le cockpit `/spogomi/[eventSlug]/espace` permet à l'organisateur habilité de
le modifier ou le corriger à tout moment, y compris après verrouillage,
certification, publication ou archivage, sans rouvrir l'événement ni toucher
à la composition, aux résultats, aux accès ou à la consolidation. Le numéro
d'équipe et l'UUID restent stables ; les projections, formulaires, classements
et exports qui consomment `public_name` relisent donc le nouveau libellé.

La route `PATCH /api/spogomi/events/[eventId]/teams/[teamId]` exige une session
et la relation organisateur de l'événement. Elle normalise le texte en NFC,
réduit les espaces superflus, accepte les accents, refuse les contrôles et les
valeurs vides ou de plus de 60 caractères, puis rejette les doublons
insensibles à la casse dans le même événement. Un pseudonyme identique dans un
autre événement reste permis. La RPC `spogomi_rename_team_public_name`
verrouille l'événement et l'équipe, compare le pseudonyme attendu, refuse une
écriture obsolète et journalise le changement réussi dans
`admin_operations_audit`. Une répétition de la valeur canonique est sans effet
et sans nouvelle entrée métier ; une mise à jour SQL directe est refusée par le
garde de la table. La révision de composition n'est pas avancée pour ce
changement de présentation.

Le contrôle serveur reste propriétaire de la décision : une collision ou une
écriture concurrente est signalée explicitement dans le cockpit et doit être
rejouée depuis l'état courant. Cette capacité ne remplace pas une procédure
d'arbitrage pour les absences ou remplacements et ne permet aucune mutation des
participants, soumissions, attestations, rangs, certifications ou XP.

## 19. Lot 11B livré — CURRENT — import multi-format et aperçu explicable

La même façade d'import lit désormais CSV, TSV, XLSX, XLS et ODS. Les CSV/TSV
acceptent les champs entre guillemets, les retours à la ligne internes, UTF-8
avec ou sans BOM, Windows-1252 lorsque l'UTF-8 est invalide, CRLF et LF. Les
classeurs peuvent contenir plusieurs feuilles et un préambule avant l'en-tête.
La feuille et l'en-tête ne sont jamais choisis silencieusement lorsque plusieurs
candidats sont plausibles.

La correspondance repose sur un registre canonique : normalisation exacte,
synonyme à haute confiance, puis suggestion fuzzy à confirmer. Tous les champs
connus, y compris les champs manquants, sont corrigeables depuis l'aperçu ; un
changement de feuille réévalue l'en-tête et ne conserve que les correspondances
encore présentes. Une ambiguïté sur billet, statut ou suppression est visible
dans l'aperçu. Le statut commercial est classifié strictement : `Payé` et les
valeurs du contrat reconnues sont admissibles, `Annulé`, `Remboursé` ou
`Supprimé` sont non admissibles, `En attente`, une absence ou une valeur
inconnue bloquent la ligne. Une valeur `Supprimé` inconnue ou absente lorsqu'une
colonne est fournie ne devient jamais implicitement `false`. Les identifiants
numériques qui risquent un arrondi ou une notation scientifique sont refusés
comme identifiants de billet. Formules textuelles, formules de classeur,
macros, liens actifs, archives corrompues et archives trop volumineuses sont
refusés ; les métadonnées ZIP et le nombre de lignes sont bornés avant les
allocations coûteuses.

La confirmation réutilise les identifiants internes et la clé externe de place,
autorise une sélection paginée de toutes les lignes admissibles et ne transforme
pas l'absence d'une place dans un export ultérieur en annulation. Le résumé
distingue créations, lignes inchangées, changements, conflits et exclusions
pour les lignes effectivement sélectionnées. Le hash identifie le document,
non l'ensemble des lignes déjà confirmé : une confirmation partielle conserve
une preuve `incomplete` et une confirmation ultérieure peut ajouter les lignes
restantes sans doublon ni destruction des décisions existantes. Les quatre
fixtures synthétiques versionnées restent l'oracle ; aucun export
Weezevent réel, contact, code-barres ou nom réel n'est versionné.
