# Gamification et publications

> Module associé à [spogomi.md](./spogomi.md). Statut : CURRENT partiel.

## 19. Gamification CleanMyMap et collection SPOGOMI

Les faits SPOGOMI restent la source métier : identité reliée et vérifiée,
présence attestée, activité de ramassage certifiée, mission d'arbitrage ou
d'organisation certifiée, participation finale confirmée et projection
officielle du classement. Une permission Clerk, une inscription ou un badge ne
constitue jamais une preuve de travail, de présence ou de résultat.

Le moteur de reconnaissance distingue deux objets :

- `progression_events` reste l'unique ledger CURRENT de l'XP et
  `progression_profiles` sa projection. La participation SPOGOMI confirmée
  rejoint uniquement la progression `participation` existante ; aucun bonus XP
  n'est lié aux points, masses, mégots ou rangs.
- Les dix distinctions répétables sont des exemplaires privés dans
  `spogomi_collection_awards`, reconstruits par le serveur depuis les faits
  certifiés. Leur unicité logique est `(user_id, event_id, badge_type_id)` :
  deux événements de 2026 peuvent donc donner deux exemplaires du même type.
  L'année civile est calculée depuis `starts_at` dans le fuseau officiel de
  l'événement, jamais depuis le compte ou la date d'attribution.

Le catalogue d'identités reste `badge-catalog.ts`. Les dix types répétables ne
sont pas ajoutés à `CURRENT_MILESTONES` et ne gonflent pas `badgeTotal`, qui
conserve son contrat `gradeCount + oneShotCount`. La lecture privée dédiée
expose `spogomiAwardCount`, `spogomiDistinctBadgeTypes` et
`spogomiEventsParticipated`, ainsi que les progressions spécialisées
`spogomi_collector_progress` et `spogomi_referee_progress`. Ces progressions
ont les seuils 1, 3, 5, 10, 25, 50, 75, 100 puis des paliers de 25 sans état
`completed` ni limite supérieure.

Le seul jalon XP SPOGOMI est `spogomi_first_referee` (`+1 XP`), enregistré une
seule fois dans `progression_events` après une mission d'arbitrage réellement
certifiée. Sa preuve est reconstruite avec une identité logique stable au
niveau du compte ; une découverte tardive ou une révocation réconcilie le
ledger sans créer de deuxième crédit. Une distinction de mission et ce jalon
exigent conjointement l'identité vérifiée, l'inscription non retirée, la
présence attestée, la participation confirmée dans `action_participants` pour
l'action du même événement, ainsi qu'une mission certifiée et sa preuve non
révoquée. Les six médailles sont `BADGE_ONLY` et sont produites
indépendamment depuis leur classement officiel certifié respectif ;
`spogomi_double_podium` exige les deux classements certifiés. Aucun rang,
départage ou conversion de mégots n'est calculé localement. Une correction
remplace l'exemplaire de cet événement et conserve l'historique d'attribution,
de révocation et de remplacement.

La mutation est exclusivement serveur via la réconciliation explicite
`POST /api/spogomi/events/:eventId/recognition/reconcile`, protégée par la
capacité organisateur et déclenchée après certification de l'événement. La
lecture `GET /api/gamification/spogomi/collection` est bornée au compte courant
et lit exhaustivement sa collection privée, sans effet de bord. Les
réconciliations refusent toute source paginée dont le comptage exact ou une
page est indisponible ; aucune révocation ne peut donc être déduite d'une
projection tronquée. Les noms, emails, tokens et identités privées du roster,
notamment celles des mineurs, ne sont pas exposés.

## 19 bis. Missions bénévoles et attestations personnelles — CURRENT

Les attestations de `spogomi_recognition_attestations` restent l'unique source
des missions bénévoles certifiées. Elles distinguent la collecte, l'arbitrage,
l'organisation, le contrôle d'arrivée, la sécurité terrain, la pesée et le tri,
ainsi que le soutien logistique. Ces valeurs décrivent une mission effectivement
réalisée et certifiée ; elles ne sont ni de nouveaux rôles Clerk, ni la preuve
qu'une personne s'est seulement inscrite, ni la preuve qu'elle possédait une
permission. Une même personne peut avoir plusieurs missions sur une édition si
chaque décision possède sa preuve, sa version et son historique.

La vue personnelle vérifie côté serveur l'identité reliée, la présence `present`,
la participation confirmée dans `action_participants`, l'état `certified` de
l'événement et les attestations non révoquées. Elle affiche séparément le nombre
d'événements confirmés, les missions certifiées, la chronologie, la collection
canonique des badges/médailles et les attestations disponibles. Aucun nouveau
badge ni XP n'est produit par ce lot : le catalogue et la réconciliation de la
gamification restent les propriétaires des distinctions existantes.

Une attestation téléchargeable est une projection privée, versionnée et
révocable dans `spogomi_volunteer_certificates`, dérivée des attestations
certifiées et non un second ledger de contributions. Sa référence opaque est
personnelle, son historique reste serveur, et une correction ou une révocation
rend l'ancienne référence invalide avant qu'une nouvelle version puisse être
émise. Le PDF A4 utilise le moteur CleanMyMap existant et contient l'identité de
la personne uniquement dans son document privé, l'événement officiel, le lieu
disponible, les missions certifiées, les versions de certification, la date
d'émission et la référence unique. Il ne contient ni heures bénévoles,
qualification, quantité individuelle non mesurée, signature SPOGOMI France,
tampon fédéral ou validation administrative implicite. Une déclaration seule,
une présence inconnue ou une validation en attente ne produit jamais de PDF.

Chaque génération et chaque téléchargement passent par Clerk et une
autorisation serveur limitée au compte courant. Les références, PDF et données
nominatives ne sont pas publiés dans les URLs publiques, les noms de fichiers
publics, les journaux ou une galerie. Le partage volontaire reste limité à un
résumé choisi (édition, mission ou badge, année, lien public de l'événement) ;
aucun nom, rang individuel ou PDF n'est publié automatiquement. Les résultats
collectifs restent étiquetés collectifs et ne sont jamais convertis en métrique
personnelle sans méthode documentée et autorisée.

## 19 ter. Publication officielle et projection minimale — CURRENT

Le classement sportif trie d'abord le score officiel décroissant puis applique
uniquement l'ordre de départage déclaré par `regulation_config.tiebreakers`.
Une valeur de départage absente ne départage pas deux équipes ; le numéro
d'équipe et l'identifiant technique ne servent qu'à stabiliser l'affichage,
jamais à inventer un vainqueur. Le classement `mégots / participant` trie le
ratio de comptage direct par participant présent vérifié décroissant et ne
réutilise pas les départages sportifs. Les égalités restent donc visibles.

Une décision officielle est liée à un instantané vérifiable du règlement, des
catégories, des équipes, des soumissions, des mesures et des présences. La
publication verrouille l'événement, compare cet instantané avant toute
mutation et refuse explicitement une source devenue obsolète. Une répétition
strictement identique est sans effet ; une nouvelle décision révoque
atomiquement l'ancienne et chaque transition est conservée dans
`spogomi_official_ranking_history`. La relecture d'une décision historique
révoquée est possible sans collision de clé et reste traçable.

Pour une édition `mixed`, cette décision est produite séparément pour chaque
division : la RPC reçoit le règlement, les classements, les équipes et un
instantané de source strictement mono-division. Une division valide sans équipe
publie un classement vide, sans gagnant ni résultat inventé. La restitution
personnelle résout ensuite l'équipe par son UUID et sa `division_id` ; elle ne
retombe jamais sur la première division lorsque la division reliée est absente
ou incohérente.

La projection publique est distincte de la projection privée organisateur.
Lorsque le statut est `unavailable`, les champs numériques et les résultats
internes sont absents du JSON ; ils ne peuvent pas réapparaître via un
`scoreResult` ou un autre alias. Les valeurs `provisional` sont explicitement
étiquetées et les valeurs `certified` exigent une décision courante concordante
avec l'instantané des sources. L'export XLSX conserve la distinction entre
soumissions certifiées et non certifiées et n'exporte jamais un score officiel
de brouillon.

## 19 quater. Organisateurs, Annuaire et impact consolidé — CURRENT

Les événements SPOGOMI réutilisent l'identité canonique `actions.organizer_id`
du registre organisateur. Le nom n'est jamais utilisé pour fusionner deux
structures proches. Une fiche de l'Annuaire partenaire n'est jointe que si elle
porte la référence explicite `organizerDirectoryId`, avec
`publicationStatus = accepted` et `verificationStatus = verifie`. Une présence
dans l'Annuaire ou dans le catalogue des organisateurs ne constitue pas, à elle
seule, un partenariat officiel CleanMyMap.

La page publique d'une édition peut afficher une carte compacte avec le nom
vérifié, le rôle `Organisateur local de l'édition`, le territoire publié et le
site officiel validé. Le lien vers l'Annuaire n'apparaît que pour une fiche
partenaire effectivement acceptée. Le mouvement ou la marque SPOGOMI, une
organisation internationale, une structure locale, un partenaire opérationnel
et un éventuel partenaire officiel CleanMyMap restent des notions distinctes ;
aucune personne morale « SPOGOMI France » n'est créée par défaut.

La surface existante `/partners/dashboard` expose une synthèse des éditions
SPOGOMI publiques associées à un organisateur canonique. Elle réutilise la
projection environnementale publiée par la consolidation et les attestations
de missions certifiées ; elle ne lit ni roster nominatif ni identité privée.
Chaque `actions.id` est dédupliqué une seule fois. Les participations terrain
par édition, les identités uniques fiables, les kilogrammes mesurés, la masse
de mégots et les mégots comptés restent des indicateurs distincts. Une masse
de mégots n'est jamais convertie en comptage observé et n'est jamais ajoutée
une seconde fois à la masse totale. Les scores sportifs ne sont pas agrégés.

La projection est recalculée depuis la version courante publiée de chaque
action et conserve la provenance de la projection (`projectionVersion` et
`sourceHash`). Une correction tardive actualise donc l'agrégat sans créer une
nouvelle somme historique. En cas de source absente, incomplète ou d'identités
non comparables, la valeur reste indisponible et la limite est indiquée ; le
produit n'affiche pas une unicité de bénévoles déduite d'une addition
d'effectifs.

Fichiers principaux :

- `apps/web/src/lib/spogomi/partner-impact.ts` — modèle public et agrégation pure ;
- `apps/web/src/lib/spogomi/partner-impact-service.ts` — lecture des événements, actions, projections et attestations publiables ;
- `apps/web/src/lib/spogomi/public-service.ts` — carte organisateur de l'édition publique ;
- `apps/web/src/app/(app)/partners/dashboard/page.tsx` — restitution dans la surface partenaire existante ;
- `apps/web/src/lib/partners/published-annuaire-entries-store.ts` — jointure explicite avec une fiche acceptée.

## 19 quinquies. Dimension internationale, actualités, agenda et photos — CURRENT

La page `/spogomi` présente une section bilingue `SPOGOMI dans le monde` à
partir d'un registre éditorial local borné. Les références officielles
actuellement publiées sont `https://spogomi.or.jp/` et
`https://en.nf-spogomiwc.com/`, vérifiées le 12 octobre 2026 dans les pages
officielles consultées. Les liens sont éditoriaux : CleanMyMap ne se présente
ni comme représentant mondial, ni comme licencié, ni comme partenaire officiel
de la fédération. Les contenus externes ne sont pas traduits ou recopiés au-delà
de ce qui est nécessaire pour un titre court et une description de navigation.

Les actualités portent une date et une URL de référence. Les événements
internationaux externes sont conservés dans le registre éditorial avec leur
source, leur date de vérification et leur statut `confirmed` ou `planned`.
L'agenda actuel présente la World Cup 2027 comme prévisionnelle, sans inventer
de date précise. Un événement externe conserve `cleanMyMapEventId = null` : il
ne crée ni `actions`, ni inscription, ni participation CleanMyMap. Les filtres
année/pays ne prétendent pas représenter une couverture mondiale exhaustive et
retournent un état vide lorsque le registre vérifié ne contient aucun résultat.

La fiche `/spogomi/[eventSlug]` ne rend une galerie que depuis
`actions.preparation_data.spogomiGallery`, après publication explicite de
l'action. Chaque photo publiée doit porter une URL d'image, une URL source, un
propriétaire ou fournisseur identifié, un texte alternatif, une approbation de
diffusion, des droits `authorized`, une revue de protection des sujets et des
mineurs, ainsi qu'une date et un identifiant d'organisateur validateur générés
côté serveur. Le POST n'accepte une publication que si ces quatre attestations
positives sont explicitement fournies ; les brouillons peuvent rester
incomplets et privés. Une photo retirée passe à l'état
`withdrawn` et disparaît de la projection publique sans supprimer les autres
preuves de l'action. Les mutations de galerie utilisent une mise à jour
conditionnelle bornée pour ne pas écraser les autres clés de
`preparation_data`. Le POST/DELETE de `/api/spogomi/events/:eventId/gallery`
réutilise l'autorisation organisateur de l'édition ; participer à l'événement
ne suffit donc pas pour publier ou retirer une photo. Les pièces jointes du
salon, les photos d'actions non explicitement approuvées et les photographies
trouvées sur Internet ne sont jamais importées automatiquement.

La galerie utilise une grille légère, des images différées, une ouverture
agrandie accessible, la navigation clavier et un état absent lorsque aucune
photo autorisée n'est disponible. La version agrandie n'est rendue qu'après
l'ouverture explicite d'une photo. Le contrat publié actuel ne contient qu'une
URL par photo et aucune variante miniature ni transformation Storage canonique
; aucune URL transformée ni image dérivée persistée ne doit donc être inventée.
Les octets économisés par une stratégie de miniature restent non mesurés tant
qu'une variante publiée et une campagne de comparaison réelle n'existent pas.
La galerie n'affiche aucun roster, nom de mineur, autorisation parentale, token
ou dossier d'arbitrage.

Fichiers principaux :

- `apps/web/src/lib/spogomi/international-content.ts` — registre éditorial et agenda externe vérifié ;
- `apps/web/src/lib/spogomi/photo-gallery.ts` — contrat pur de droits, publication et retrait ;
- `apps/web/src/lib/spogomi/photo-gallery-service.ts` — lecture publique et écriture organisateur bornée ;
- `apps/web/src/app/api/spogomi/events/[eventId]/gallery/route.ts` — permissions serveur de galerie ;
- `apps/web/src/components/spogomi/spogomi-international-content.tsx` — bloc bilingue, actualités et filtres ;
- `apps/web/src/components/spogomi/spogomi-photo-gallery.tsx` — grille et visionneuse clavier.
