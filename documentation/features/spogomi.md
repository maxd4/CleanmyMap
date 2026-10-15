# SPOGOMI — intégration événementielle et consolidation CleanMyMap

> **Statut : CURRENT PARTIEL — la préparation, la certification, les projections publiques bornées, les deux classements indépendants, la consolidation et l'export XLSX sont livrés sur les contrats explicitement présents dans le dépôt. Les preuves runtime externes et l'intégration partenaire restent à valider en environnement de validation.**
> Ce document ne prouve ni l'existence des tables et interfaces décrites, ni un partenariat contractualisé, ni la validation d'un règlement officiel SPOGOMI. Après chaque lot, ne passer en `CURRENT` que les comportements réellement livrés et testés.
>
> **Périmètre :** événements SPOGOMI organisés avec CleanMyMap, modes `casual`, `world_cup` et `mixed` (`Casual & World Cup`), inscriptions importées, équipes, mesures, classements par division, action canonique agrégée et participations confirmées.

## 1. Décision centrale

Une édition parentale SPOGOMI possède des données sportives par équipe, mais produit **une seule action environnementale canonique CleanMyMap**. Dans le schéma courant, `spogomi_events` est cette édition parente : `action_id` reste unique et aucune division ne crée une action supplémentaire.

Une édition possède une division `casual`, une division `world_cup`, ou les deux. Le mode parent `mixed` est valide uniquement avec exactement ces deux divisions distinctes. Les divisions portent un UUID stable, déterministe à partir de l’édition et de leur type ; une reprise identique réutilise les mêmes lignes.

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
- Les groupes d'amis ou commandes préconstitués sont préservés autant que possible. L'affectation automatique est **déterministe**, prévisualisée, expliquée et manuellement corrigeable. La proposition privilégie les trios, décompose notamment `5 → 3 + 2` et `6 → 3 + 3`, puis regroupe les restes selon les bornes Casual de l'événement. Tout inscrit ou toute place non affectable demeure dans « À affecter » ; personne fictive n'est créée.
- L'organisateur verrouille une version de composition avant le démarrage ; toute modification ultérieure doit être tracée.

L'effectif collectif vérifié est :

```text
participants_presents = nombre d'identités terrain distinctes
                       dont la présence a été attestée
```

Ne jamais prendre automatiquement `3 × équipes` comme effectif réel. Ne pas déduire l'âge ni la catégorie adulte/enfant/retraité d'une donnée absente.

## 4. Inscriptions Excel et confidentialité

L'entrée partenaire est un fichier CSV/TSV ou un classeur XLSX/XLS/ODS de personnes inscrites ou de places vendues. Le mapping Cachan accepte `N. Billet`, `N. de commande`, le statut du billet et la suppression ; une place valide est conservée par billet, même sans occupant identifié. Le nom d'acheteur n'est jamais une clé de déduplication et ne crée jamais plusieurs identités supposées.

L'import comporte les étapes suivantes : dépôt privé par organisateur autorisé ; lecture serveur bornée ; correspondance explicite des colonnes ; aperçu et signalement des anomalies ; affectation d'identifiants internes ; confirmation ; écriture idempotente ; compte rendu des lignes ajoutées, ignorées, modifiées et rejetées.

- Conserver, quand disponible, une clé externe stable permettant le réimport. Sinon construire une stratégie de résolution explicite sans fusionner automatiquement deux homonymes.
- Pour la billetterie, `external_reference` identifie la place, `order_reference` sert uniquement au regroupement de composition, et les statuts/annulations sont conservés sans suppression implicite. Les collisions de billet, changements, annulations et réactivations sont signalés et historisés.
- Un nom fourni par la billetterie reste une donnée d'affichage importée et ne constitue pas une identité vérifiée. Une annulation automatique est distinguée d'un retrait humain par l'historique `ticket_cancelled` correspondant à l'état commercial courant : `Payé → registered`, `Annulé/Supprimé → withdrawn`, puis une réactivation vérifiée peut revenir à `registered` avec le même UUID. Une décision de présence, de liaison, d'identité ou de composition, ainsi qu'un retrait sans preuve commerciale correspondante, restent protégés et nécessitent un arbitrage explicite.
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

Le ratio utilise exclusivement les mesures dont la catégorie sportive est reliée
au slug environnemental canonique `cigarette_butt`. Les autres objets comptés,
la masse totale, la masse de mégots et l'effectif présent vérifié restent des
mesures distinctes. Une correspondance absente, un comptage de mégots partiel
ou un effectif non strictement positif rend le ratio `non comparable`.

La certification exige le règlement courant complet au moment de la mutation
PostgreSQL : source et version concordantes, catégories et unités cohérentes,
coefficients confirmés, précision d'arrondi, éligibilité et départages valides.
Une modification concurrente du règlement impose une nouvelle version et ne
peut pas rendre silencieusement une certification obsolète. Une valeur calculée
avant certification reste une `prévisualisation`; seul l'état `certified` porte
un score officiel.

Les lectures serveur des résultats, participants, soumissions, items et
projections de consolidation sont paginées par clé et ordre déterministes.
Toute page en erreur fait échouer la lecture complète plutôt que de publier un
résultat partiel.

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

La consolidation ne possède que la référence officielle qu'elle a effectivement
installée. Une géométrie déjà présente dans l'action reste préservée lorsqu'elle
provient d'un suivi GPS, d'un import GPX, d'un dessin manuel ou d'une autre
source indépendante. La valeur `geometry_source = 'reference'` ne suffit pas à
établir la propriété SPOGOMI : pour retirer une ancienne référence, le serveur
doit retrouver la métadonnée `spogomiOfficialReference` et constater que la
géométrie courante correspond exactement à celle qu'elle décrit. En cas de
doute, la donnée géographique est conservée.

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
Le code est haché côté serveur, à usage unique, expirant et non réutilisable ;
aucune recherche par nom/prénom, lecture du fichier Excel ou exposition d'email
ne participe à la décision. L'organisateur habilité peut émettre un code depuis
son parcours privé, et sa remise reste manuelle/hors bande.

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
photo autorisée n'est disponible. Elle n'affiche aucun roster, nom de mineur,
autorisation parentale, token ou dossier d'arbitrage.

Fichiers principaux :

- `apps/web/src/lib/spogomi/international-content.ts` — registre éditorial et agenda externe vérifié ;
- `apps/web/src/lib/spogomi/photo-gallery.ts` — contrat pur de droits, publication et retrait ;
- `apps/web/src/lib/spogomi/photo-gallery-service.ts` — lecture publique et écriture organisateur bornée ;
- `apps/web/src/app/api/spogomi/events/[eventId]/gallery/route.ts` — permissions serveur de galerie ;
- `apps/web/src/components/spogomi/spogomi-international-content.tsx` — bloc bilingue, actualités et filtres ;
- `apps/web/src/components/spogomi/spogomi-photo-gallery.tsx` — grille et visionneuse clavier.

## 19 sexies. Navigation et cockpit organisateur — CURRENT

La carte « Compétitions SPOGOMI » est visible sous « Actions futures » dans le
composant réellement monté par `JoinActionSection` et renvoie vers `/spogomi`,
y compris lorsque la liste d'actions est vide ou filtrée. La page publique
présente uniquement les événements explicitement publiés. Pour une session
authentifiée, elle expose aussi l'entrée « Mes événements SPOGOMI » vers
`/spogomi/mes-evenements` sans charger les brouillons dans la page publique.

Le catalogue personnel obtient les éditions depuis des lectures serveur
paginées des relations `created_by_clerk_id`, `action_organizers`,
`spogomi_event_reviewers` actifs et `spogomi_participants` vérifiés. Il ne
consulte pas le rôle global pour fabriquer une relation événementielle et ne
transmet pas de lieu, roster ou autre projection de gestion au client.
Les filtres sont calculés sur les relations réellement présentes ; une
habilitation révoquée, un compte seul ou un nom importé ne crée aucune entrée.
Le cockpit privé canonique est `/spogomi/[eventSlug]/espace`. Sa page résout
d'abord la relation événementielle par slug avec
`resolveSpogomiEventAccessBySlug`, puis affiche uniquement les sections
correspondant aux capacités réellement accordées. La navigation persistante
contient Présentation, Équipes, Résultats, Arbitrage, Bilan et Paramètres ;
les vues organisateur réutilisent `loadSpogomiManagementProjection`, tandis
que les observateurs passent par `loadSpogomiObserverProjection` et restent
strictement en lecture. Les arbitres utilisent la projection d'arbitrage et
ses mutations tracées. Chaque API continue de refaire son propre contrôle
serveur : le masquage d'une section n'est jamais une autorisation.
Les événements créés depuis le formulaire appellent seulement
`POST /api/spogomi/events`, utilisent une clé d'idempotence et restent privés
par défaut. La navigation vers la gestion est réservée aux événements ainsi
autorisés ; le lien public n'est rendu que lorsque `public_visibility` vaut
`published`.

Le décompte de la carte reste désactivé tant qu'une source canonique ne fournit
pas un instant de début exact, confirmé et horodaté. L'agenda éditorial de la
World Cup 2027 est donc rendu comme prévisionnel, sans date inventée. Les liens
de saisie équipe restent générés par l'API protégée ; le bouton d'ouverture
réutilise uniquement l'URL temporaire retournée par le serveur, avec les
protections de session, d'expiration, de révocation et de referrer existantes.

Fichiers principaux :

- `apps/web/src/components/sections/rubriques/rejoindre-un-formulaire-section.explorer.tsx` ;
- `apps/web/src/components/spogomi/spogomi-future-card.tsx` et `spogomi-countdown.tsx` ;
- `apps/web/src/app/(app)/spogomi/page.tsx` ;
- `apps/web/src/app/(app)/spogomi/mes-evenements/page.tsx` et
  `apps/web/src/app/(app)/spogomi/nouveau/page.tsx` ;
- `apps/web/src/components/spogomi/spogomi-personal-events-list.tsx` ;
- `apps/web/src/lib/spogomi/personal-events-service.ts` ;
- `apps/web/src/components/spogomi/spogomi-event-cockpit.tsx` ;
- `apps/web/src/components/spogomi/spogomi-observer-cockpit-panel.tsx` ;
- `apps/web/src/app/(app)/spogomi/[eventSlug]/espace/page.tsx` ;
- `apps/web/src/app/(app)/spogomi/mes-evenements/error.tsx`.

## 19 septies. Autorisation par capacité et périmètre — CURRENT

Les accès SPOGOMI sont évalués côté serveur avec l'identité Clerk, une capacité
et l'événement demandé. Le rôle Clerk global n'est jamais remplacé par une
habilitation SPOGOMI et `activeRole` reste la source des capacités globales.

| Accès | Capacité et projection |
|---|---|
| public | uniquement la projection effectivement publiée |
| participant lié | sa projection privée et ses informations personnelles autorisées |
| session d'équipe | le formulaire et les soumissions de son équipe, via le token de session |
| observateur habilité | lecture opérationnelle non sensible, sans mutation |
| arbitre habilité | projection d'arbitrage des soumissions nécessaires et décisions autorisées |
| organisateur/coorganisateur | projection de gestion de son événement |
| admin/max actif | supervision selon la capacité globale consommée, jamais selon une simple présence Clerk |

`action_organizers` reste la relation canonique organisateur/coorganisateur.
`spogomi_event_reviewers` porte les habilitations `observer` et `referee`,
toujours limitées par `event_id`, avec révocation et audit dans
`spogomi_event_access_audit`. Une habilitation d'un événement ne s'étend jamais
à une autre édition.

Les projections serveur sont séparées :

- `loadSpogomiManagementProjection` peut contenir le roster nominatif, mais
  seulement après le garde organisateur ;
- `loadSpogomiEventResultReviews` est la projection d'arbitrage et reste
  réservée à l'organisateur ou à l'arbitre actif ;
- `loadSpogomiObserverProjection` ne lit ni noms de participants, ni roster,
  ni mesures détaillées et n'expose aucune mutation ;
- les lectures privées participant/bénévole et les sessions d'équipe restent
  owner/session-scoped dans leurs services existants.

L'attribution ou la révocation d'une habilitation est une mutation organisée,
bornée à l'événement et auditée atomiquement par
`spogomi_set_event_access`. Une tentative directe d'un observateur sur une
route de gestion, d'import, de classement ou d'arbitrage est refusée côté
serveur. La certification reste séparée de l'auto-certification : un membre de
l'équipe ne peut pas certifier sa propre soumission.

Fichiers principaux :

- `apps/web/src/lib/spogomi/authorization.ts` ;
- `apps/web/src/lib/spogomi/management-projection.ts` ;
- `apps/web/src/lib/spogomi/observer-projection.ts` ;
- `apps/web/src/app/api/spogomi/events/[eventId]/observer/route.ts` ;
- `apps/web/src/app/api/spogomi/events/[eventId]/reviewers/route.ts` ;
- `apps/web/supabase/migrations/20261015000011_spogomi_event_capability_access.sql`.

## 19 octies. Cloisonnement mixte — CURRENT structurel / COMPATIBILITY historique

La migration append-only `20261015000012_spogomi_division_regulations_and_operations.sql`
place les versions, états, sources, configurations réglementaires et bornes de
composition sur `spogomi_divisions`. Les opérations critiques disposent de
points d'entrée server-only qui exigent `event_id + division_id` et vérifient
les appartenances croisées avant toute écriture : composition, déplacement,
saisie, arbitrage, attestation et publication des classements. Les snapshots,
audits, historiques et reprises idempotentes conservent cette provenance.

Les éditions `casual` et `world_cup` historiques restent compatibles : leur
division déterministe reçoit le règlement parent existant et les anciennes
voies ne résolvent implicitement une division que lorsque l'édition n'en
possède qu'une. Une édition `mixed` exige toujours la division explicite et
refuse une ressource d'une autre division. Deux équipes portant le numéro `1`
restent donc indépendantes.

La consolidation reste parentale et utilise l'unique `action_id`. Les mesures
certifiées des divisions conservent leurs identifiants de division dans les
sources et sont agrégées une seule fois ; les scores sportifs n'alimentent
jamais la masse environnementale. Les reconnaissances sportives et les
attestations gardent la division de leur preuve. Un certificat bénévole reste
une projection personnelle unique par personne et édition, y compris lorsque
ses missions couvrent plusieurs divisions.

L'export privé conserve les quatre feuilles canoniques (`Synthèse`, `Équipes`,
`Catégories`, `Traçabilité`) et expose la division avec l'identifiant d'équipe,
le règlement et les résultats associés. Le mode mixte n'est pas exposé dans
le formulaire de création tant que la lane PostgreSQL transactionnelle et les
parcours navigateur desktop/mobile n'ont pas été réellement exécutés avec
succès.

**Preuves de ce lot :** tests Vitest ciblés et contrats statiques exécutés ;
typecheck Web exécuté. La sémantique PostgreSQL et le parcours navigateur
restent à qualifier séparément sur une base de validation autorisée.

## 20. Sources canoniques liées

- [Participation et formulaire de groupe](./group-action.md)
- [Moteur de gamification](./gamification/GAMIFICATION_ENGINE.md)
- [Gouvernance des données](../architecture/data-governance.md)
- [Protocole scientifique](../product/SCIENTIFIC_PROTOCOL.md)
- [AuthN/AuthZ](../security/authz-authn-regles.md)
- [Registre des pages](../pages_site/README.md)
