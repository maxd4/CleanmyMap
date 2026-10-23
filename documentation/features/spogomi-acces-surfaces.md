# Accès, identités et surfaces

> Module associé à [spogomi.md](./spogomi.md). Statut : contrats et périmètres.

## 10. Organisateur, permissions et identités

L'affichage produit peut utiliser **SPOGOMI France** comme libellé public
provisoire, à résoudre par le répertoire canonique (`organizerId` /
`organizerName`). Cela ne présume ni d'une personne morale distincte ni du rôle
juridique exact ; le type juridique réel (`association`, `collective`, `other`,
etc.) n'est pas encore confirmé et ne doit pas être inventé.

`action_organizers` et les règles AuthN/AuthZ existantes déterminent les personnes autorisées. Le créateur technique de l'événement n'est pas automatiquement un participant présent ; le nom d'une structure n'accorde aucun droit administratif.

Surfaces à distinguer :

| Surface | Accès attendu |
| --- | --- |
| Roster nominatif, correspondance Excel, tokens | Organisateurs explicitement habilités, jamais public |
| Saisie d'équipe | Session authentifiée et limitée à une seule équipe, droit de soumettre mais pas de certifier |
| Arbitrage, règlement, correction et publication | Organisateur/arbitre autorisé avec trace serveur |
| Classement des équipes | Projection publique minimale, selon état de publication |
| Bilan de l'action CleanMyMap | Autorisations et modération canoniques de l'action |
| Liaison à un compte Clerk | Propriétaire du compte + preuve de rattachement au roster |

Appliquer les règles API pour AuthN/AuthZ dans le handler, validation des inputs, garde d'abus, atomicité des mutations multiples et refus avant accès privilégié. Supabase `service_role` ne vaut jamais autorisation HTTP.

Pour les personnes mineures, ne pas afficher de nom ou de données individuelles en public par défaut. Pour les utilisateurs CleanMyMap, respecter le consentement public `profiles.leaderboard_public_opt_in` : un consentement à la gamification générale n'est **pas** un consentement automatique à une compétition SPOGOMI nominative, ni l'inverse.

## 11. Comptes bénévoles et gamification CleanMyMap

L'inscription Excel, la présence terrain, le rattachement Clerk et la participation finale confirmée sont quatre états différents.

1. L'utilisateur s'authentifie avec Clerk sur la page de l'événement.
2. Il revendique une entrée du roster par preuve non triviale (code individuel sécurisé, vérification adaptée ou validation organisateur), **jamais par simple homonymie**.
3. La preuve associe le compte à une seule identité d'inscription de l'événement, avec résolution des conflits et audit.
4. La présence réelle est attestée séparément par l'organisateur.
5. Pour une action finalisée, utiliser le parcours `post_action_claim` et la review existante ; une confirmation de présence peut fournir un contexte probant au validateur, mais n'autorise aucune insertion silencieuse `confirmed`.
6. Seules les lignes `action_participants` avec `participation_status = confirmed` alimentent gamification, badges, stats et quotes-parts individuelles.

Une personne présente sans compte participe au **bilan collectif**, mais n'obtient pas d'XP. Une personne liée sans présence validée n'obtient pas de crédit. Un membre d'équipe ne reçoit jamais la totalité de la récolte collective à titre individuel.

Après une liaison vérifiée, la même lecture serveur restitue la section personnelle
« Mon équipe SPOGOMI » : uniquement le nom public et le numéro de l'équipe
historique, la division lorsqu'une division réelle est rattachée, la présence
attestée, l'état de la demande de participation et les résultats effectivement
publiés pour cette équipe. Un `team_id` absent ou une équipe introuvable reste
« Équipe non renseignée » ; aucun nom, billet, roster ou résultat ne permet de
déduire une affectation. Une fiche publiée peut porter ce parcours public ; une
édition privée ne rend pas sa fiche accessible et conserve la liaison sur le
parcours authentifié par invitation et code individuel.

Réutiliser `apps/web/src/lib/actions/participation/individual-impact.ts` pour les attributions individuelles ou quotes-parts sous les conditions canoniques. Ne jamais fabriquer une mesure individuelle exacte à partir d'une répartition, ni affecter des points de compétition à la progression générale.

Les recalculs d'attribution et notifications doivent rester idempotents, sans double attribution à chaque republication du bilan.

## 12. Interface, classements et exports

Parcours cible sur les surfaces appropriées du produit (les chemins finaux doivent respecter le registre route-first existant) :

- organisateur : création, import Excel, aperçu roster, composition/édition des équipes, GPX, règlement, arbitrage, consolidation, export ;
- équipe : consultation restreinte, formulaire propre, état de soumission ;
- public : événement, GPX de référence, état officiel/provisoire, classement sportif, ratio mégots comparables, bilan collectif et lien vers l'action ;
- bénévole connecté : revendication d'identité externe, claim de participation, progression CleanMyMap existante.

La liaison d'un compte CleanMyMap est désormais proposée depuis la page publique
de l'événement, mais elle exige un code individuel remis par l'organisateur.

Si la personne n'a pas reçu ou a perdu ce code, la carte propose « Je n'ai pas
de code ». Après authentification, elle peut transmettre une demande minimale
bornée à l'événement : aucun rattachement n'est tenté et aucun participant n'est
recherché automatiquement. Un élément de contexte libre et limité peut orienter
la recherche, mais un nom, un prénom, une adresse électronique ou une référence
de billet ne constitue jamais une preuve.

Dans l'espace événementiel privé, l'organisateur habilité voit les demandes de
son seul événement et peut les marquer en attente, traitées, refusées ou
annulées. Une décision « traitée » exige la sélection explicite d'une entrée du
roster non liée et une note de vérification indépendante. Elle ne modifie ni le
participant ni l'équipe ; l'organisateur doit ensuite déclencher séparément
l'émission existante du code et le remettre directement à la personne concernée.
Les demandes sont idempotentes par compte/événement, protégées par limitation
de débit, journalisées par transition et révocables par le demandeur tant
qu'elles sont en attente. Aucune présence, participation, récompense,
classement ou certification ne découle de la demande ou de sa liaison.
Les réponses privées du demandeur restent une projection minimale limitée à
l'identifiant de sa demande, son statut, sa date de création et le contexte
qu'il a lui-même fourni. Elles n'exposent jamais l'identifiant de rapprochement
au roster, les notes de vérification ou de décision, ni une donnée nominative
d'un autre participant ; ces informations restent dans la projection
organisateur protégée.

Pour une édition privée, le même formulaire n'est accessible qu'après un lien
d'invitation opaque, expirant et remis directement par l'organisateur. Un
événement privé invalide, un token expiré/révoqué et un événement absent
retournent la même indisponibilité sans énumérer les participants ou les
métadonnées de l'édition. Le token n'est jamais conservé en clair.
Le code est haché côté serveur, à usage unique, expirant et non réutilisable ;
aucune recherche par nom/prénom, lecture du fichier Excel ou exposition d'email
ne participe à la décision. L'organisateur habilité peut émettre un code depuis
son parcours privé, et sa remise reste manuelle/hors bande.

Une seconde voie, distincte de l'assistance « code perdu », permet depuis une
fiche d'événement publiée de demander à rejoindre une équipe publique. Elle
requiert AuthN et ne crée ni participant ni équipe : la demande reste `pending`,
est personnelle au compte et à l'événement, peut être annulée par son auteur et
ne modifie aucun score, classement, présence, badge ou total environnemental.
La file privée est réservée aux rôles actifs `admin` et `max` ; un organisateur,
coorganisateur, arbitre, observateur ou coordinateur non admin ne peut ni
accepter ni refuser cette demande.

Deux demandes publiques supplémentaires utilisent la même file, mais restent
distinctes d'une demande de rattachement à une équipe existante :

- avant l'événement, `registration` permet une nouvelle inscription authentifiée
  seulement lorsque l'état, la division et le règlement l'autorisent. Elle ne
  fabrique ni billet, ni équipe, ni action ; une approbation `admin|max` crée
  uniquement l'identité d'inscription SPOGOMI sans présence attestée ni
  `action_participants`. Une billetterie externe obligatoire ou le parcours
  World Cup officiel ferme cette voie sauf autorisation explicite du règlement ;
- pendant l'événement, `presence_regularization` permet de signaler une
  présence réelle absente du roster. Une approbation auditée ne modifie ni le
  roster, ni l'équipe, ni les résultats et ne vaut pas participation CleanMyMap.

Les divisions sont explicites pour une édition `mixed` et le serveur revalide
l'état, la politique, la billetterie, le mode World Cup et la capacité sous
verrou lors de l'approbation. Le demandeur ne reçoit qu'une projection de sa
propre demande (`id`, type, division éventuelle, contexte fourni, statut,
message public et dates). Les identifiants de rapprochement, notes internes,
identités du roster, identifiants de décideur et secrets restent dans la
projection d'administration protégée. Une reprise active n'est idempotente que
si l'événement, le compte, le type, la division et l'équipe effectivement
demandés correspondent ; une tentative dans une autre division ou équipe
retourne un conflit explicite sans créer de doublon.

Un refus administratif peut être enregistré sans sélectionner d'identité
historique et sans note de vérification ; seule la note de décision facultative
reste conservée. Une approbation exige toujours une identité existante du
roster appartenant exactement à l'équipe demandée et une vérification
indépendante. La réponse personnelle du demandeur contient uniquement l'id de
la demande, l'équipe publique effective, le statut et les dates utiles ; les
notes, l'identité rapprochée et l'identité du décideur restent réservées à la
file `admin|max`.

L'acceptation exige la sélection d'une identité `spogomi_participants` déjà
existante et appartenant à l'équipe demandée, ainsi qu'une note de vérification
indépendante. Le nom, le prénom, l'adresse électronique ou une référence de
billet peuvent orienter une recherche privée, mais ne constituent jamais une
preuve automatique. La transaction vérifie aussi l'événement, l'équipe, le
statut d'inscription, l'absence de liaison concurrente et l'unicité du compte
dans l'événement ; elle lie uniquement `clerk_id` et `account_link_status` de
l'identité sélectionnée, sans modifier `team_id`, les compositions verrouillées,
les résultats ou `action_participants`. Les transitions et la liaison sont
auditées ensemble, avec reprise idempotente et protection contre les courses.

Les événements privés ne sont jamais énumérés par cette voie. L'API publique
retourne seulement l'état personnel de la demande pour un compte authentifié ;
la lecture de la file, du compte demandeur et du roster reste server-only et
réservée à `admin|max`. Les codes individuels restent la première méthode de
liaison et conservent leurs garanties existantes.

Une décision `approved`, `rejected` ou `cancelled` d'une demande d'admission
est également projetée dans la boîte `app_notifications` du compte demandeur,
avec le sous-type `spogomi_admission_decision` et une clé d'événement stable.
La projection est privée, idempotente et respecte `notification_preferences`;
elle ne crée aucune notification pour une personne restée sans compte et ne
modifie ni l'identité terrain, ni la présence, ni `action_participants`.

Cette liaison met à jour uniquement l'identité `spogomi_participants`. Elle ne
atteste ni la présence ni la participation CleanMyMap. Après liaison, le serveur
réutilise le parcours canonique de l'action : `action_registrations` en phase
`pre_action`, `post_action_claim` vers `action_participants` en phase
`post_action_complete`. La consommation du code et la demande de participation
sont deux étapes distinctes : le code reste à usage unique, tandis qu'une
identité déjà vérifiée peut reprendre la demande sans saisir à nouveau le code.
Une perte réseau entre ces étapes est donc récupérable ; les demandes
`pending` ou `confirmed` sont retournées sans doublon et une demande
`cancelled` ou refusée n'est pas réactivée silencieusement. Dans les deux cas,
la demande reste soumise à la review existante de l'organisateur ; seule une
ligne `action_participants` avec `participation_status = confirmed` déclenche
la progression, les badges et les statistiques personnelles. Une personne
présente sans compte reste dans le bilan collectif sans recevoir d'XP, et une
correction ne crée pas de second crédit.

La table d'audit privée `spogomi_identity_link_events` conserve les émissions et
échanges de codes. Les index uniques garantissent qu'une identité SPOGOMI ne
peut être liée qu'à un compte et qu'un compte ne peut être lié deux fois au
même événement. Les scores sportifs et les effectifs SPOGOMI ne sont jamais
convertis en comptes Clerk ou en crédits individuels.

Les classements SPOGOMI sont **séparés** du classement générique `/api/gamification/leaderboard/public`. Le rafraîchissement public doit être borné, économe en ressources et limiter strictement les champs publiés. Les données fictives utilisées en test ne sont pas des résultats terrain.

Exporter un véritable fichier XLSX avec quatre onglets au minimum :

1. **Synthèse** : événement, mode, date, statut, équipes, effectif présent, déchets hors mégots, masse et compte de mégots, version du bilan.
2. **Équipes** : identifiants/noms publiables, présence, points, rang, quantités et statut arbitral.
3. **Catégories** : une ligne par équipe/catégorie, unités, quantités brutes, points sportifs, correspondance environnementale.
4. **Traçabilité** : origine des mesures, version du règlement, références de soumissions, corrections, exclusions et consolidation.

Les vues et exports doivent consommer les **mêmes projections serveur**, pas recoder des scores dans des chemins concurrents. L'export authentifié de l'organisateur peut contenir des informations nominatives si nécessaires et autorisées ; aucun export public ne révèle le roster privé. Neutraliser l'injection de formules tableur, valider MIME, nom de fichier et contenu. Utiliser la génération serveur pour ne pas charger un moteur XLSX lourd sur la page publique.

## 13. Ordre d'intégration et conditions d'arrêt

| Lot | Produit attendu | STOP CONDITION |
| --- | --- | --- |
| 1. Socle | Schéma, contrats, RLS, audit, règlements versionnés | Invariants et tests de frontière validés, sans UI |
| 2. Préparation | Création événement/action unique, import roster, équipes, GPX référence | Organisateur peut préparer un événement de test sans résultats |
| 3. Arbitrage | Formulaires dédiés, mesures fines, score paramétré, certification | Une équipe peut soumettre ; seuls habilités certifient |
| 4. Consolidation | Somme des données physiques certifiées vers `actions` | Une seule action ; recalcul sans doublon ; provenance correcte |
| 5. Participation | Liaison Clerk et `post_action_claim`, gamification existante | Seuls les utilisateurs confirmés ont les crédits appropriés |
| 6. Restitution | Pages, deux classements, XLSX, E2E | Parcours intégral vérifié dans les environnements disponibles |
