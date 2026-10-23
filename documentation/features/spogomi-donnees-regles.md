# Données, import et règlements

> Module associé à [spogomi.md](./spogomi.md). Statut : CURRENT et dépendances explicites.

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
