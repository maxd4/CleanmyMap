# SPOGOMI — intégration événementielle et consolidation CleanMyMap

> **Statut : PLAN — cible fonctionnelle et contrats d'intégration à implémenter.**
> Ce document ne prouve ni l'existence des tables et interfaces décrites, ni un partenariat contractualisé, ni la validation d'un règlement officiel SPOGOMI. Après chaque lot, ne passer en `CURRENT` que les comportements réellement livrés et testés.
>
> **Périmètre :** événements SPOGOMI organisés avec CleanMyMap, modes `casual` et `world_cup`, inscriptions importées, équipes, mesures, classements, action canonique agrégée et participations confirmées.

## 1. Décision centrale

Un événement SPOGOMI possède des données sportives par équipe, mais produit **une seule action environnementale canonique CleanMyMap**.

```text
Événement SPOGOMI (casual | world_cup)
  ├── Inscrits importés (personnes externes, présence distincte)
  ├── Équipes et membres
  ├── Parcours GPX officiel de référence
  ├── Règlement sportif versionné
  └── Formulaire SPOGOMI dédié par équipe
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

**Frontières non négociables :**

- Le formulaire SPOGOMI par équipe n'est ni le formulaire générique des bénévoles ni `public.forms` ; cette dernière table a déjà des consommateurs de gamification.
- Les résultats sportifs ne sont pas de l'XP CleanMyMap. Les deux classements et les deux mécaniques sont indépendants.
- Une seule action `actions.id` représente la collecte collective sur la carte et dans les statistiques : aucune action par équipe, aucune action supplémentaire lors d'un recalcul.
- Les données détaillées de compétition ont leur propriétaire SPOGOMI ; la table `actions` reçoit une **projection** du bilan physique validé, pas une nouvelle saisie indépendante.
- La projection doit pouvoir être reconstruite et sa provenance vérifiée. Un changement de résultat ne s'ajoute jamais au bilan existant : il le remplace après nouvelle validation.

## 2. État observé du dépôt et réutilisation

Le dépôt possède déjà les owners suivants ; ils ne doivent pas être recréés :

| Responsabilité | Owner existant à consulter |
| --- | --- |
| Actions, phases et créateurs | `apps/web/src/lib/actions/`, `public.actions` |
| Répertoire et identité organisateur | `apps/web/src/lib/actions/organizer-directory-registry.ts`, `action_organizers` |
| Inscriptions avant action | `action_registrations` |
| Participation après action et approbation | `action_participants`, `apps/web/src/lib/actions/participation/post-action-claims.ts` |
| Formulaires génériques existants | `public.forms`, contrats `documentation/features/group-action.md` |
| Mesures physiques | `apps/web/src/lib/waste/measurement.ts`, `apps/web/src/lib/waste/cigarette-butts.ts` |
| Géométrie et import | `apps/web/src/lib/actions/geometry/gpx.ts`, contrats de géométrie des actions |
| Gamification des comptes | `apps/web/src/lib/gamification/` |
| Export, noms de livraison | `apps/web/src/lib/reports/` |
| Accès et gouvernance | `documentation/security/authz-authn-regles.md`, `documentation/architecture/data-governance.md` |

Les futurs composants SPOGOMI doivent consulter la version de ces owners sur `main` avant intégration. Une « façade » compatible n'est pas une source de vérité concurrente.

## 3. Mode et équipes

- `world_cup` : une équipe inscrite comprend **trois membres**. C'est une contrainte de composition, **pas** la preuve que les trois membres étaient présents le jour de l'événement.
- `casual` : effectif maximal/minimal paramétrable selon les consignes réelles de l'organisateur ; ne pas imposer un chiffre universel sans règlement applicable.
- Les noms affichés des deux modes sont des libellés produit ; les règles et pénalités d'un événement officiel ne sont appliquées qu'avec le règlement propre à cet événement.
- Chaque équipe a une identité et un numéro stables à l'intérieur de l'événement, indépendants de son nom modifiable.
- Les groupes d'amis préconstitués sont préservés autant que possible. L'affectation automatique est **déterministe**, prévisualisée et manuellement corrigeable. Tout inscrit non affectable demeure dans « À affecter » ; personne fictive n'est créée.
- L'organisateur verrouille une version de composition avant le démarrage ; toute modification ultérieure doit être tracée.

L'effectif collectif vérifié est :

```text
participants_presents = nombre d'identités terrain distinctes
                       dont la présence a été attestée
```

Ne jamais prendre automatiquement `3 × équipes` comme effectif réel. Ne pas déduire l'âge ni la catégorie adulte/enfant/retraité d'une donnée absente.

## 4. Inscriptions Excel et confidentialité

L'entrée partenaire est un classeur Excel ou CSV de personnes inscrites. Son schéma exact reste à confirmer auprès de SPOGOMI France : **aucun en-tête, identifiant ni champ obligatoire externe n'est présumé connu**.

L'import comporte les étapes suivantes : dépôt privé par organisateur autorisé ; lecture serveur bornée ; correspondance explicite des colonnes ; aperçu et signalement des anomalies ; affectation d'identifiants internes ; confirmation ; écriture idempotente ; compte rendu des lignes ajoutées, ignorées, modifiées et rejetées.

- Conserver, quand disponible, une clé externe stable permettant le réimport. Sinon construire une stratégie de résolution explicite sans fusionner automatiquement deux homonymes.
- Les données d'inscription externes ne créent **jamais** automatiquement de compte Clerk, d'inscription canonique `action_registrations` ni de participation finale `action_participants`.
- Distinguer `inscrit`, `membre d'équipe`, `présent attesté`, `compte lié vérifié` et `participation CleanMyMap confirmée`.
- Minimiser les données importées, restreindre l'accès au roster nominatif, fixer une conservation appropriée, prévoir la suppression et l'export dans les parcours RGPD existants. Ne pas conserver de fichier brut dans un espace public.
- Ne pas placer les emails, téléphones, identités de mineurs, tokens ou lignes brutes dans des URLs publiques, journaux, erreurs, exports publics ou payloads des classements.

## 5. Modèle métier cible

Les noms ci-dessous définissent les **responsabilités logiques**. Codex ajuste les détails SQL au checkout réel et recherche d'abord tout équivalent canonique. L'unique arbre de migration éditable est `apps/web/supabase/migrations/` ; migrations append-only, RLS et règles scoped.

| Entité logique | Responsabilité et invariants |
| --- | --- |
| `spogomi_events` | Événement, mode, état, dates, propriétaire autorisé, action canonique associée ; lien `action_id` unique et non réattribué silencieusement |
| `spogomi_teams` | Identité stable par événement, nom public, composition et états sportifs ; contrainte sur le nombre de membres selon le mode |
| `spogomi_participants` | Identité externe minimale, lien éventuel à une équipe, présence attestée, lien Clerk **optionnel et vérifié**, unicités adaptées |
| `spogomi_category_rules` | Catégories sportives et unités, coefficients, arrondis, pénalités/départages et mapping environnemental ; règlement sourcé et versionné |
| `spogomi_result_submissions` | Révision de résultat d'une équipe, auteur, moment, statut, certification et historique non destructif |
| `spogomi_result_items` | Mesure brute par catégorie, unité, provenance, éventuel comptage distinct de la masse |
| Consolidation/version d'agrégat | Sources certifiées sélectionnées, hash de révision, action cible, état de publication, exclusions, timestamp et acteur validateur |

L'historique de correction est append-only ou audité avant/après ; le « dernier résultat certifié courant » doit être identifiable sans ambiguïté, y compris après refus ou rectification.

Ne pas recopier les identités Clerk, les rôles globaux ni les mesures physiques de `actions` dans une seconde source runtime maîtresse.

## 6. Règlements et scores SPOGOMI

**Dépendance externe ouverte :** obtenir le règlement applicable à chaque édition et mode, incluant catégories, unités, coefficients, limites, pénalités, exclusions, précision d'arrondi et départages. Plusieurs barèmes circulent selon les événements ; **aucun coefficient numérique n'est validé pour CleanMyMap à ce stade**.

Le moteur de score doit être une fonction pure, paramétrée par une version de règlement explicite et testable. La configuration doit identifier la source, la date/version applicable, les unités, les seuils, les sanctions et les règles de départage. Si elle est incomplète, afficher les quantités physiques admissibles mais **ne jamais certifier un score officiel**.

Deux tableaux distincts :

1. **Sportif :** points par équipe calculés uniquement à partir du règlement de l'événement ; statut `provisoire` ou `certifié`, sanctions et départage explicites.
2. **Mégots par participant :** `nombre de mégots réellement comptés / nombre de membres présents vérifiés` ; si le numérateur n'est connu qu'en masse, ou si le dénominateur n'est pas confirmé et supérieur à zéro, le ratio est `non comparable`, pas zéro.

Une conversion scientifique de masse de mégots en nombre, lorsqu'autorisée par un autre domaine, est une donnée **dérivée** ; elle ne devient jamais un « comptage observé » dans ce classement sans définition et étiquetage explicites. Une disqualification sportive ne supprime pas automatiquement une collecte physique valide du bilan environnemental.

## 7. Formulaire dédié par équipe et arbitrage

Chaque équipe possède son formulaire SPOGOMI propre, distinct des parcours bénévoles génériques. Accès par session d'équipe à privilèges limités (par exemple invitation vérifiée, secret échangeable et révocable), sans obligation implicite de compte Clerk pour les personnes externes. Le mécanisme doit éviter les liens devinables et les tokens durables exposés dans des logs ou referrers ; accès aux autres équipes interdit.

Les données saisies comprennent la quantité par catégorie dans son unité, la masse en **grammes** lorsque mesurée, les nombres directement comptés lorsqu'ils le sont, la méthode, la provenance, l'auteur et l'heure. Ne pas imposer la résolution `0,1 kg` du formulaire générique à ces relevés plus fins. Une valeur vide est inconnue, non nulle.

États de résultat : brouillon, soumis, certifié, refusé ou remplacé après correction. La soumission ne certifie pas ; seul un arbitre ou organisateur habilité valide. Les versions et décisions concurrentes sont contrôlées et auditées. Les données non certifiées ne sont pas utilisées pour publier le bilan final.

Le périmètre **environnemental** des mesures peut être évalué distinctement de l'éligibilité de l'équipe au classement sportif, notamment en cas de pénalité ou disqualification.

## 8. Consolidation dans l'action canonique

Après validation explicite de l'organisateur, un orchestrateur serveur produit le bilan physique de l'événement depuis les **versions certifiées et retenues** des résultats d'équipes. Il ne soumet pas de faux formulaire navigateur et n'écrit pas de nouveau `public.forms`.

```text
Pour chaque catégorie c :
  masse_c = Σ masses_validées_et_comparables(équipe, c)
  compte_c = Σ comptes_observés_et_comparables(équipe, c), si définis

Masse totale hors mégots = somme des masses physiques non chevauchantes
Masse mégots = somme distincte des masses de mégots disponibles
Nombre mégots observés = somme des comptes réellement comptés, si complets
Participants = personnes distinctes et présentes, attestées
```

Préserver l'exactitude des valeurs jusqu'à la projection et les unités ; aucun arrondi intermédiaire injustifié. Les mesures inconnues restent inconnues. Lorsque certains chiffres existent mais que le périmètre total est incomplet, afficher explicitement une couverture **partielle** plutôt qu'un « total complet » trompeur.

La correspondance catégories SPOGOMI → catégories CleanMyMap est explicite, versionnée et **non nécessairement bijective**. Utiliser les contrats :

- `CanonicalWasteBreakdown` : `recyclablesKg`, `glassKg`, `householdWasteKg`, `otherWasteKg` ;
- `ActionCigaretteButtsMeasurements` : compte, masse, volume, conditions et provenance séparés ;
- `WasteCategorySlug` : taxonomie détaillée si utile et autorisée par les consommateurs.

Les catégories non associables restent signalées et tracées ; aucune conversion arbitraire. Empêcher le double comptage des mégots entre leur masse propre et `wasteKg`, et des catégories incluses dans d'autres catégories.

L'orchestrateur produit un **aperçu de publication** : équipes et soumissions prises en compte, absences, valeurs, données manquantes, exclusions, correspondances et action cible. Il conserve une empreinte déterministe des sources et le détail des décisions de consolidation.

La mise à jour est idempotente et transactionnelle (`ATOMIC`) si l'ensemble des écritures métier doit réussir ensemble ; sinon exposer et justifier un contrat `PARTIAL_ALLOWED` avec reprise et audit. **Jamais de double action ni de second ajout de déchets lors d'une réexécution.** Une correction certifiée ultérieure remplace la projection environnementale précédente après revalidation.

Le cycle de modération et de publication de l'action CleanMyMap ne doit pas être contourné : un bilan SPOGOMI « certifié » ne signifie pas qu'une action est automatiquement approuvée et publiée.

Le formulaire générique et ses autres parcours lisent `actions` comme source canonique. Les champs sous contrôle de la consolidation ne sont pas éditables librement sans processus de correction de la source SPOGOMI ; éviter les écritures concurrentes et les incohérences.

## 9. GPX officiel et géométrie

Un événement peut fournir un périmètre officiel de collecte sous forme de zone
cartographique, de carte communiquée aux participants, ou, si le partenaire le
fournit réellement, de parcours GPX. La zone officielle n'implique donc pas la
présence d'un GPX et un GPX ne doit jamais être fabriqué à partir d'une zone.

**Sémantique impérative :** un GPX officiel = parcours prévu/autorisé, **pas**
trajet effectivement parcouru ni couverture mesurée. Une éventuelle trace GPS
effectivement parcourue est une provenance distincte et ne peut être déduite du
GPX de référence.

Réutiliser `apps/web/src/lib/actions/geometry/gpx.ts` pour parser et valider, tout en adaptant la **provenance** lors de la projection : le contrat `ActionGpxImportMetadata` historique utilise `observedDistanceKm`, ce qui ne suffit pas à attester une distance observée pour un GPX officiel de compétition. Préserver une provenance `reference` ou un équivalent canonique non ambigu, avec tests de lecture, affichage et export, plutôt que de renommer artificiellement la nature de la preuve.

Conserver les contraintes de sécurité du parseur et ne pas concaténer des segments disjoints pour inventer un tracé continu.

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
Le code est haché côté serveur, à usage unique, expirant et non réutilisable ;
aucune recherche par nom/prénom, lecture du fichier Excel ou exposition d'email
ne participe à la décision. L'organisateur habilité peut émettre un code depuis
son parcours privé, et sa remise reste manuelle/hors bande.

Cette liaison met à jour uniquement l'identité `spogomi_participants`. Elle ne
atteste ni la présence ni la participation CleanMyMap. Après liaison, le serveur
réutilise le parcours canonique de l'action : `action_registrations` en phase
`pre_action`, `post_action_claim` vers `action_participants` en phase
`post_action_complete`. Dans les deux cas, la demande reste soumise à la review
existante de l'organisateur ; seule une ligne `action_participants` avec
`participation_status = confirmed` déclenche la progression, les badges et les
statistiques personnelles. Une personne présente sans compte reste dans le
bilan collectif sans recevoir d'XP, et une correction ne crée pas de second
crédit.

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

La préparation privée est désormais portée par `/spogomi/[eventSlug]/gestion` et permet
à un compte authentifié qui possède la relation organisateur canonique de :

- créer un brouillon avec une seule action CleanMyMap liée par `action_id` ; la
  réservation serveur, l'empreinte des paramètres et le lease de reprise de
  `spogomi_event_creation_attempts` empêchent une double création concurrente,
  vérifient le propriétaire et permettent de reprendre un échec de liaison sans
  créer une seconde action (`PARTIAL_ALLOWED`) ; le type juridique SPOGOMI
  France reste provisoire tant que le répertoire ne le configure pas ;
- déposer un CSV ou XLSX de roster privé, sélectionner explicitement les
  colonnes utiles, voir les inconnues, erreurs et doublons probables, puis
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
  conforme ;
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

## 16. Lot 3 livré — CURRENT — surfaces publiques et gestion contextuelle

Les trois routes canoniques sont intégrées dans la famille visuelle et documentaire
**Agir** :

- `/spogomi` présente les modes et ne charge que les événements dont
  `public_visibility = published` ; les dates réelles servent uniquement à
  distinguer à venir, en cours et terminé ;
- `/spogomi/[eventSlug]` expose une projection publique bornée de l'événement,
  sans roster nominatif, et conserve la provenance `official_reference` du GPX ;
- `/spogomi/[eventSlug]/gestion` réutilise le cockpit du lot 2 derrière une
  AuthN/AuthZ serveur liée à l'organisateur de l'action canonique. La publication
  est explicite et réversible ; un événement privé n'est pas révélé par ses
  métadonnées ou par le sitemap statique.

`event_slug` est une identité d'URL stable et unique du propriétaire
`spogomi_events`. Il est normalisé à la création et conserve sa valeur si le nom
change ; une collision reçoit un suffixe dérivé de l'action canonique. La
projection publique ne lit aucune table de roster et ne renvoie que les noms
publics d'équipe, le parcours officiel et un lien vers l'action CleanMyMap
réellement publiée.

Des liens contextuels conditionnels sont ajoutés depuis la communauté, la liste
des actions rejoignables et le panneau de la carte. Ils ne créent ni quatrième
entrée Agir, ni action CleanMyMap supplémentaire, ni point cartographique par
équipe. Les sections de résultats et de classement restent explicitement vides
jusqu'aux lots qui les implémenteront.

Fichiers principaux :

- `apps/web/src/lib/spogomi/public-service.ts` ;
- `apps/web/src/app/(app)/spogomi/` et `apps/web/src/app/api/spogomi/public/` ;
- `apps/web/src/components/spogomi/spogomi-context-link.tsx` ;
- `apps/web/supabase/migrations/20261012000003_spogomi_public_pages.sql`.

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
Les arbitres sont attribués et révoqués par un organisateur au niveau de
l'événement ; leur rôle n'est jamais déduit d'un champ envoyé par le client.
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
correction traçable. Aucune action par équipe ni soumission automatique à
`public.forms` n’est effectuée.

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
- `apps/web/supabase/migrations/20261012000007_spogomi_action_consolidation.sql` — mapping, projection, RPC et protection des champs contrôlés.

## 17 bis. Addendum public vérifié — contrat à intégrer (PLAN)

> **Statut : PLAN documentaire.** Cet addendum intègre des informations
> publiques consultées le 12 octobre 2026. Il ne transforme pas ces
> informations en règlement contractuel de CleanMyMap et ne fait pas foi pour
> une édition française tant que SPOGOMI France n'a pas confirmé le règlement
> et les données applicables à l'événement concerné.

### 17 bis.1 Sources et niveaux de portée

Les sources suivantes sont séparées par portée :

| Source | Portée utilisable | Limite de preuve |
| --- | --- | --- |
| [Fédération japonaise — règles](https://spogomi.or.jp/rule/) | Règles générales publiées : format de base, zone désignée, sécurité, déplacement groupé et principes de score | La page précise que les règles sont localisées selon chaque tournoi ; elle ne fixe pas le règlement français de chaque édition. |
| [Fédération japonaise — organiser un tournoi](https://spogomi.or.jp/organize/) | Sélection de la zone, règles de tri, remise d'un règlement adapté et déroulement avec pesée | Il s'agit d'un cadre d'organisation, pas d'un barème ou d'une délégation juridique pour CleanMyMap. |
| [World Cup — site officiel](https://en.nf-spogomiwc.com/) | Contexte World Cup, équipes de trois, une heure de compétition + vingt minutes de tri, et édition 2027 annoncée comme prévue | Le calendrier 2027 reste présenté comme prévisionnel ; les qualifications locales doivent être confirmées par leur organisateur. |
| [World Cup — conditions de participation](https://en.nf-spogomiwc.com/terms/) | Conditions propres au contexte World Cup 2027 : équipe de trois, mineurs, représentation, voyage, remplacements et équipes gagnantes précédentes | Ces conditions ne s'appliquent pas automatiquement à `casual` ni à tout événement français. La page est une règle d'édition/contexte, pas une décision de SPOGOMI France. |
| [ARTEMA — règles de participation](https://www.artema-network.com/participer-spogomi) | Exemple français publié : une heure de collecte, vingt minutes de tri, zone désignée, retard, avertissements et sécurité | Exemple et communication de l'organisateur français ; l'édition et le règlement applicables doivent être identifiés pour chaque événement. |
| [ARTEMA — SPOGOMI Nice 2024](https://www.artema-network.com/spogomi-nice) | Exemple d'édition : trois personnes, horaires opérationnels, retard de plus de dix minutes, avertissements et rôles de bénévoles, dont Excel et pesée | Données propres à Nice 2024 ; elles ne constituent pas une règle universelle ni un contrat pour une autre édition. |
| [ARTEMA — World Cup 2025 France](https://www.artema-network.com/spogomiwc2025) | Exemple daté de qualification française et de déroulement d'une édition World Cup | Archive d'édition 2025 ; ne pas en déduire les règles de 2027 ou d'un Casual. |

La version ou la date d'une règle doit être conservée dans la configuration de
l'événement. Lorsqu'une page publique n'expose pas de numéro de version, le
contrat doit enregistrer au minimum l'URL, la date de consultation, l'édition
et la confirmation reçue du partenaire, sans inventer une version.

### 17 bis.2 Chronométrage et phases

Les contrats d'événement doivent prévoir une configuration versionnée des
phases, au lieu d'une durée globale codée en dur :

- début officiel de la collecte et heure limite de collecte ;
- fin effective de collecte, si elle est constatée séparément ;
- fin du tri ;
- heure réelle de retour de chaque équipe ;
- début/fin de pesée et validation des résultats ;
- auteur, horodatage et motif de toute correction ultérieure.

Le format général publié par la Fédération japonaise indique 60 minutes,
composées de 40 minutes de collecte et 20 minutes de tri, avec possibilité de
réduction liée à la météo ou d'adaptation en deux périodes. Le site World Cup
décrit 60 minutes de compétition suivies de 20 minutes de tri ; ARTEMA publie
également une modalité française d'une heure de collecte et vingt minutes de
tri. Ces éléments sont des références de cadre ou des exemples d'édition, pas
un réglage automatique.

Le chronométrage officiel doit être contrôlé par un responsable autorisé de
l'événement et rester corrigeable avec une trace. Les durées World Cup ne sont
jamais appliquées automatiquement à un événement `casual`. La durée, la
tolérance de retard et leurs conséquences sont versionnées avec le règlement
de l'événement.

### 17 bis.3 Déplacement, sécurité et infractions

La fiche de consignes destinée aux équipes doit pouvoir reprendre, lorsque le
règlement de l'édition le confirme, les règles suivantes : ne pas courir ;
rester groupé avec un écart maximal de 10 mètres entre le premier et le dernier
membre ; respecter les piétons et la circulation ; collecter uniquement dans
la zone autorisée et sur les surfaces autorisées ; ne pas prendre les déchets
dans les poubelles ou lieux de collecte ; ne pas récupérer d'objet
vraisemblablement détenu par autrui ; ne pas entrer dans une propriété privée,
un cours d'eau ou la chaussée dangereusement ; ne pas soulever de plaques de
caniveau ; ne pas prendre de seringue, liquide inconnu, objet dangereux ou
encombrant interdit.

Un arbitre ou responsable sécurité peut enregistrer une infraction catégorisée
avec l'équipe concernée, l'heure, le lieu éventuellement déclaré, la
justification, l'auteur et la version du règlement. Le système ne tente pas de
déduire automatiquement toutes les infractions d'un GPX, d'une zone ou d'une
trace GPS. La sécurité reste une décision opérationnelle et non un score
numérique autonome.

### 17 bis.4 Arbitrage, pénalités et bilan physique

Le contrat d'arbitrage doit permettre au règlement d'une édition de représenter
au moins : avertissement, pénalité en points lorsqu'un montant est effectivement
publié, correction du tri, disqualification, révision et annulation d'une
décision. Chaque décision conserve son motif, son acteur, son horodatage, sa
valeur éventuelle et la version du règlement.

Les pages françaises consultées mentionnent une déduction pour retour tardif,
une disqualification après plus de dix minutes de retard dans les exemples
concernés et une disqualification possible après avertissements répétés. Ces
modalités restent attachées aux pages/éditions qui les publient : aucun `-10`,
`-100` ou autre montant ne doit être inventé pour un événement qui n'a pas
confirmé son barème.

Le score brut, les pénalités et le score final doivent être stockés et affichés
comme trois notions distinctes. Une disqualification sportive ne supprime pas
les déchets réellement collectés du bilan environnemental ; elle modifie
l'éligibilité ou la publication sportive selon le règlement certifié.

### 17 bis.5 Rôles opérationnels et séparation des pouvoirs

L'exemple ARTEMA de Nice décrit des fonctions de sécurité, de pointage des
masses dans Excel, de contrôle du retour des équipes, de pesée et de
préparation des cérémonies. Le parcours organisateur doit donc pouvoir
attribuer, à l'échelle de l'événement et non comme six rôles globaux Clerk :

- gestion de l'événement ;
- arbitrage et sécurité ;
- chronométrage ;
- pesée ;
- saisie/import des résultats ;
- lecture des résultats publiés.

Une même personne peut cumuler des fonctions si le règlement et l'organisateur
l'autorisent. Les contrôles serveur doivent toutefois empêcher une équipe de
certifier sa propre pesée ou de modifier les pénalités d'une autre équipe.
L'attribution et la révocation des droits doivent être auditées et s'appuyer
sur la relation organisateur canonique et un scope d'événement.

### 17 bis.6 Interopérabilité des classeurs de pesée

L'import des inscrits reste distinct de l'import des mesures. Un futur import
de classeur de pesée doit fournir :

- aperçu des lignes et colonnes avant validation ;
- confrontation aux équipes connues et signalement des mesures déjà saisies ;
- résolution explicite des conflits ;
- provenance `import_excel` ;
- historique, empreinte et reprise idempotente.

Un import ne certifie jamais une pesée sans autorisation explicite de la
personne habilitée. Aucun schéma de classeur français n'est inventé à partir
des pages publiques : un exemplaire anonymisé et les règles de correspondance
doivent être demandés à SPOGOMI France.

### 17 bis.7 Périmètre officiel, GPX et traces observées

Trois objets sont indépendants :

1. le périmètre officiel de collecte, qui peut être une zone ou une carte ;
2. un itinéraire GPX officiel, uniquement s'il est effectivement fourni ;
3. une trace GPS réellement parcourue, uniquement si elle est collectée et
   conservée avec cette provenance.

Lorsque le GPX est absent, l'interface peut représenter une zone officielle
fiable sans la présenter comme un trajet observé. Avant de créer un nouveau
modèle géométrique, l'écart avec les contrats de géométrie existants de
CleanMyMap doit être documenté. Le domaine ne doit pas convertir une distance
théorique en distance parcourue.

### 17 bis.8 Conditions World Cup 2027 et mineurs

Les [conditions World Cup publiées](https://en.nf-spogomiwc.com/terms/) font
apparaître, pour ce contexte d'édition, une équipe exactement composée de
trois membres, un consentement parental/tuteur pour les mineurs, un adulte
responsable si un membre a moins de 12 ans, des conditions de représentation
du pays, la capacité à voyager pour une finale internationale, des règles de
remplacement et une restriction de reconstitution d'une équipe gagnante.

Ces conditions sont qualifiées `world_cup`, édition 2027, et ne sont pas
appliquées à `casual` par défaut. Le modèle doit permettre une vérification
manuelle et une trace avant/après des remplacements. Il ne demande pas par
défaut de passeport, justificatif de nationalité ou document parental et ne
conserve pas de copie de document sensible sans nécessité, base légale et
durée de conservation approuvées.

### 17 bis.9 Consentements, publication et identité juridique

Les notions suivantes restent indépendantes : inscription, présence,
éligibilité sportive, consentement à la participation, droit à l'image,
consentement à la publication de résultats individuels et liaison volontaire à
un compte CleanMyMap. Le classement par équipes peut être public avec des noms
d'équipe autorisés, sans publier les noms, âges, emails ou nationalités des
membres. La présence possible de mineurs impose une minimisation et une
publication prudentes.

ARTEMA publie et présente des événements français dans les sources consultées,
mais cela ne suffit pas à conclure que « SPOGOMI France » est une personne
morale distincte ni à lui attribuer automatiquement l'action CleanMyMap. Avant
de figer l'organisateur canonique, confirmer la dénomination juridique, le rôle
exact d'ARTEMA et des autres partenaires, l'autorité de partage des données et
les comptes autorisés à administrer les événements. Le nom public d'un événement
peut différer de l'identité juridique de son organisateur.

### 17 bis.10 Cas de validation à conserver pour les lots concernés

Les contrats et écrans qui implémenteront ces capacités devront couvrir, sans
les simuler dans ce document : durée configurable et correction tracée ; retard
et sanction versionnée ; disqualification sans suppression du bilan physique ;
droits distincts de pesée, arbitrage et chronométrage ; import de résultats
Excel idempotent avec conflits ; périmètre sans GPX ; éligibilité World Cup
distincte de `casual` ; mineur et consentement ; liaison de compte indépendante
des conditions sportives.

## 18. Points encore à confirmer auprès de SPOGOMI France

- Règlement complet applicable à chaque mode, catégories, coefficients, unités, arrondis, pénalités, départages et conditions de disqualification.
- Exemple **anonymisé** et schéma réel du classeur des inscriptions ; qualité des identifiants externes et champs optionnels.
- Paramètres de composition Casual, critères d'éligibilité World Cup, modalités de vérification de présence, rôle effectif des arbitres.
- Identité juridique exacte de la structure, comptes des représentants habilités et conditions de délégation.
- Circuit de validation des résultats et des données environnementales ; corrections après proclamation.
- Modalités de publication des équipes, consentements, mineurs, durée de conservation des inscrits et gestion des demandes RGPD.
- Règlement et durée applicables à chaque édition, y compris le format des phases,
  la tolérance de retard et les effets des avertissements.
- Exemple **anonymisé** et schéma réel du classeur de pesée, en plus du classeur
  des inscriptions ; qualité des identifiants et règles de résolution des conflits.
- Format du périmètre officiel et existence éventuelle d'un GPX ou de traces
  GPS, sans assimiler ces objets.
- Conditions World Cup 2027 effectivement applicables aux événements français,
  notamment mineurs, représentation, remplacements et consentements.
- Dénomination juridique, rôle et habilitations de l'organisateur français.

Ces incertitudes ne bloquent pas les contrats généraux, mais **interdisent** de figer un barème « officiel », un effectif observé non attesté ou une conversion physique non justifiée.

## 19. Sources canoniques liées

- [Participation et formulaire de groupe](./group-action.md)
- [Moteur de gamification](./GAMIFICATION_ENGINE.md)
- [Gouvernance des données](../architecture/data-governance.md)
- [Protocole scientifique](../product/SCIENTIFIC_PROTOCOL.md)
- [AuthN/AuthZ](../security/authz-authn-regles.md)
- [Registre des pages](../pages_site/README.md)
