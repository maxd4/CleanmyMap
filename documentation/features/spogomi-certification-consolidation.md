# Certification et consolidation

> Module associé à [spogomi.md](./spogomi.md). Statut : CURRENT.

## 16. Lot 3 livré — CURRENT — surfaces publiques et gestion contextuelle

Les trois routes canoniques sont intégrées dans la famille visuelle et documentaire
**Agir** :

- `/spogomi` présente les modes et ne charge que les événements dont
  `public_visibility = published` ; les dates réelles servent uniquement à
  distinguer à venir, en cours et terminé ;
- `/spogomi/[eventSlug]` expose une projection publique bornée de l'événement,
  sans roster nominatif, et conserve la provenance `official_reference` du GPX ;
- `/spogomi/mes-evenements` est le catalogue personnel canonique après AuthN :
  il déduplique les éditions accessibles par création, organisation,
  habilitation active d'arbitre/observateur ou liaison participant vérifiée,
  puis expose uniquement les dates, statut, mode et accès effectivement
  disponibles ; `/spogomi/nouveau` réutilise le formulaire privé et
  `/dashboard/spogomi` reste une redirection de compatibilité vers la liste ;
- `/spogomi/[eventSlug]/espace` réutilise le cockpit du lot 2 derrière une
  AuthN/AuthZ serveur liée à l'organisateur de l'action canonique. La publication
  est explicite et réversible ; un événement privé n'est pas révélé par ses
  métadonnées ou par le sitemap statique.

`/spogomi/[eventSlug]/gestion` reste un alias de compatibilité vers
`/spogomi/[eventSlug]/espace`. Les quatre surfaces privées réutilisent les mêmes
services de catalogue, de création et de préparation ; aucune permission ou
nouvelle capacité métier n'est attachée au changement d'URL.

`event_slug` est une identité d'URL stable et unique du propriétaire
`spogomi_events`. Il est normalisé à la création et conserve sa valeur si le nom
change ; une collision reçoit un suffixe dérivé de l'action canonique. Les
segments réservés `nouveau` et `mes-evenements` ne sont jamais attribués à une
nouvelle édition : les anciennes lignes éventuellement présentes restent
inchangées et les nouvelles créations reçoivent un suffixe déterministe. La
projection publique ne lit aucune table de roster et ne renvoie que les noms
publics d'équipe, le parcours officiel et un lien vers l'action CleanMyMap
réellement publiée.

Des liens contextuels conditionnels sont ajoutés depuis la communauté, la liste
des actions rejoignables et le panneau de la carte. Ils ne créent ni quatrième
entrée Agir, ni action CleanMyMap supplémentaire, ni point cartographique par
équipe. Les sections de résultats et de classement restent explicitement vides
jusqu'aux lots qui les implémenteront.

Les pages publiques `/spogomi` et `/spogomi/[eventSlug]` proposent aussi le
topic `spogomi` du canal communautaire existant via la messagerie :
`/sections/messagerie?tab=discussions&channel=community&topicId=spogomi`. Ce
topic couvre les échanges sur les événements, les équipes, les questions des
nouveaux participants, la préparation, la sécurité, le bénévolat et les liens
internationaux. Il ne crée ni nouveau canal ni conversation d'action parallèle.
Les messages restent des échanges communautaires et ne valent ni arbitrage, ni
classement, ni résultat officiel ; le règlement et les résultats de référence
sont ceux publiés par l'organisateur habilité.

Fichiers principaux :

- `apps/web/src/lib/spogomi/public-service.ts` ;
- `apps/web/src/app/(app)/spogomi/` et `apps/web/src/app/api/spogomi/public/` ;
- `apps/web/src/components/spogomi/spogomi-context-link.tsx` ;
- `apps/web/supabase/migrations/20261012000003_spogomi_public_pages.sql` ;
- `apps/web/supabase/migrations/20261012000018_spogomi_community_topic.sql`.

## 17. Lot 4 livré — CURRENT — saisie et certification par équipe

Le formulaire `/spogomi/[eventSlug]/equipe` est une surface privée accessible
par un lien généré depuis le cockpit organisateur. Le lien porte un secret
opaque à durée limitée ; seul son hash est conservé. Son échange crée une
session HttpOnly limitée à l'événement et à l'équipe, et la régénération ou la
révocation invalide les accès précédents. Les routes appliquent le rate
limiting avant la résolution du secret. Aucun compte CleanMyMap n'est exigé
pour la saisie partenaire.

Chaque catégorie du règlement peut conserver séparément la quantité dans son
unité, la masse brute en grammes, le nombre d'objets réellement comptés, la
méthode, la provenance et un commentaire d'arbitrage. Une valeur vide reste
inconnue et n'est pas convertie en zéro. La masse n'est jamais convertie en
nombre de mégots et la résolution du formulaire générique n'est pas réutilisée.

La sauvegarde atomique par équipe est idempotente. Les états sont `draft`,
`submitted`, `certified`, `rejected` et `superseded`. Une soumission ne certifie
jamais ; l'organisateur ou l'arbitre habilité décide depuis la revue privée.
Une correction d'une version certifiée crée une nouvelle version, conserve la
référence de remplacement et écrit un audit append-only. Les verrous par équipe
et les prédicats de statut refusent les certifications concurrentes obsolètes.
Les arbitres et observateurs sont attribués et révoqués par un organisateur au
niveau de l'événement ; leur habilitation n'est jamais déduite d'un champ envoyé
par le client et la révocation est auditée. Un observateur ne reçoit qu'une
lecture opérationnelle non sensible et ne peut pas appeler une mutation.
Un participant lié à l'équipe revue ne peut pas certifier cette équipe.

Le moteur pur de `apps/web/src/lib/spogomi/scoring.ts` calcule séparément le
score sportif, la masse en grammes, le comptage direct et l'effectif présent.
Il ne produit un score officiel que si la configuration de règlement contient
une version, une source, les catégories complètes, l'arrondi, l'éligibilité et
les départages. Sinon les totaux physiques restent disponibles et le score est
`unavailable`. Le ratio mégots par participant est `non comparable` sans
comptage direct ou sans effectif présent strictement positif. Aucun transfert
vers `public.forms`, la gamification ou le bilan collectif CleanMyMap n'est
effectué dans ce lot.

Les fonctions SQL de sauvegarde et de revue sont server-only et exécutables
uniquement par `service_role` après contrôle de session équipe ou d'AuthZ
organisateur côté serveur. La migration locale n'est pas une preuve de son
application sur Supabase distant.

## 17 ter. Lot 5 livré — CURRENT — consolidation vers l’action canonique

Le cockpit organisateur expose un aperçu puis une publication explicite du
bilan environnemental. L’orchestrateur serveur lit uniquement le pointeur
`spogomi_teams.certified_submission_id` et exige que la soumission courante
soit `certified`. Les équipes non certifiées, les mesures nulles, les unités
inconnues et les catégories sans correspondance restent exclues et bloquent la
publication ; aucune valeur ne devient zéro par défaut.

La correspondance catégorie SPOGOMI → catégorie environnementale est conservée
dans `spogomi_environment_category_mappings` avec une version, une unité source,
une unité cible, un facteur explicite, la provenance et le statut de mapping.
Les masses sont agrégées en grammes avec une précision de trois décimales dans
les colonnes SPOGOMI dédiées. Les mégots conservent séparément leur masse et
leur comptage direct ; une masse n’est jamais convertie en nombre. Les
catégories imbriquées peuvent être marquées `counts_toward_total = false` afin
d’éviter une double comptabilisation. Les points sportifs, l’XP et la
gamification ne participent à aucune mesure environnementale.

Chaque événement conserve une seule action cible et une seule projection
courante. La RPC `consolidate_spogomi_event_to_action` est le propriétaire de
la mutation `ATOMIC` : verrou transactionnel de l’événement et de l’action,
vérification du règlement/état, remplacement de la projection courante,
conservation des versions précédentes en `superseded`, puis mise à jour de
l’action existante. La clé de consolidation, le hash SHA-256 des sources, la
version et la révision rendent une réexécution identique idempotente et une
correction traçable. L’idempotence porte uniquement sur le hash de la
projection `is_current` : si une correction B est ensuite remplacée par le
contenu A déjà présent dans l’historique, A reçoit une nouvelle révision
courante au lieu de retourner silencieusement l’ancienne ligne. La contrainte
historique `event_id + source_hash` n’est donc pas une clé d’idempotence.
Aucune action par équipe ni soumission automatique à `public.forms` n’est
effectuée.

Avant publication, le serveur charge exhaustivement les catégories, mappings,
équipes, soumissions, items, participants et référence GPX par pages
déterministes de 1 000 lignes. Une page en erreur bloque l’aperçu. Une équipe
certifiée doit posséder exactement un item pour chaque catégorie réglementaire
attendue ; une soumission certifiée incomplète ne peut pas produire un bilan
`readyForPublication`.

L’aperçu conserve aussi un snapshot des versions `updated_at` et des
métadonnées contrôlées de toutes les sources utilisées. La RPC verrouille ces
collections puis compare le snapshot avant mutation. Une modification de
l’événement, de l’action cible, des mappings, mesures, certifications,
présences ou GPX entre l’aperçu et la publication produit un conflit et ne
modifie ni l’action ni la projection courante. La réexécution concurrente du
même aperçu retourne uniquement la projection courante déjà concordante.

L’effectif provient des participants `registered` et `present` vérifiés, sans
remplacer l’événement par les seuls comptes Clerk. Les sous-catégories
démographiques inconnues restent inconnues. Le GPX importé est conservé dans
la projection comme `official_reference` et affiché explicitement comme
parcours de référence non observé. L’identité SPOGOMI France n’est importée
que si elle est résolue dans le registre canonique ; sinon aucune identité
n’est inventée.

Après une projection courante, le trigger SQL refuse à une édition ordinaire
de modifier silencieusement les masses, mégots, effectif, date, lieu,
organisateur, géométrie de référence ou métadonnées de consolidation. La
consolidation ne publie pas automatiquement l’action CleanMyMap : les phases,
la modération et les autorisations de publication des actions ordinaires
restent applicables.

Fichiers principaux :

- `apps/web/src/lib/spogomi/consolidation.ts` — moteur pur d’agrégation ;
- `apps/web/src/lib/spogomi/consolidation-service.ts` — lecture, hash et RPC ;
- `apps/web/src/app/api/spogomi/events/[eventId]/consolidation/route.ts` — aperçu/publication protégés ;
- `apps/web/supabase/migrations/20261012000007_spogomi_action_consolidation.sql` — mapping, projection et protection initiale des champs contrôlés ;
- `apps/web/supabase/migrations/20261012000011_harden_spogomi_consolidation_revisions.sql` — replay des hashes historiques, snapshot transactionnel et remplacement atomique.

## 17 ter.1. Clôture explicite des équipes — CURRENT

La clôture sportive ne déduit plus une absence, un forfait ou une contestation
d'une soumission manquante. La table append-only
`spogomi_team_closure_decisions` porte, par événement, division et équipe, le
statut explicite (`present_measured`, `absent`, `forfeit`, `excluded`,
`disqualified`, `result_missing` ou `contested`), l'éligibilité sportive,
l'éligibilité environnementale, la version, le motif et l'auteur. Une seule
décision est courante ; une correction conserve la ligne précédente et le RPC
`spogomi_set_team_closure_decision` refuse les versions obsolètes. Un forfait
n'est donc jamais converti en zéro kg ou zéro point.

Les deux axes restent indépendants : une équipe disqualifiée du classement
peut conserver une mesure environnementale certifiée, alors qu'une absence ou
un forfait explicite est exclu du bilan sans donnée fictive. Une équipe
`result_missing` ou `contested` reste bloquante tant qu'aucune décision validée
ne permet de distinguer participation, exclusion justifiée et donnée absente.
La consolidation capture le jeu courant des décisions et ses soumissions
environnementales ; elle bloque en cas de modification concurrente. La
publication d'un classement capture le même état par division via le garde-fou
`publish_spogomi_official_rankings_for_division_checked_closure`.

Le cockpit organisateur expose une synthèse séparée des phases terrain,
arbitrage, classements, consolidation, action CleanMyMap et demandes
individuelles. L'action CleanMyMap reste soumise à son propre cycle de
modération : aucune certification sportive ne vaut publication automatique de
l'action. Les demandes individuelles persistées de l'édition sont comptées
séparément ; une demande `pending` maintient explicitement la phase en attente
et ne devient pas une certification sportive ou environnementale par défaut.

Une correction de clôture après proclamation révoque les classements courants,
supersède la consolidation environnementale courante et conserve les preuves
dans leurs historiques append-only. Les attestations de collecte et les
distinctions dépendant d'un classement sont révoquées/remplacées avec motif et
auteur ; la masse mesurée n'est pas recalculée à partir de la sanction. Une
nouvelle publication des classements, une nouvelle consolidation et une
réconciliation des distinctions sont requises après validation du snapshot
corrigé.

Les migrations `20261015000026_spogomi_closure_decisions.sql`,
`20261015000027_spogomi_closure_publication_guards.sql` et
`20261015000028_spogomi_ranking_closure_guard.sql` portent ces invariants ; le
smoke SQL mixed exécuté en CI éphémère vérifie le replay, l'historique,
l'unicité de la décision courante et le refus d'un mauvais scope de division.
