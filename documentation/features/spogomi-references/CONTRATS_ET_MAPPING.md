# Contrats de correspondance — SPOGOMI 2026

**Statut : `REFERENCE / SNAPSHOT`**. Cette note décrit les documents fournis et les décisions de modélisation du kit. Le contrat runtime reste `documentation/features/spogomi.md` et le code `main`.

## 1. Matrice des sources

| Source | Observation factuelle | Usage visé | Risque |
|---|---|---|---|
| Capture « CACHAN SHEET » (20/09/26 affiché) | 5 catégories, poids kg, points par catégorie, rang, équipe, points, poids total, pénalités. | Mise en page de l'export World Cup, non données de production. | Capture seule : aucune formule Excel vérifiable ; arrondis/départages non documentés. |
| `classement et point casual.xlsx` | Feuille `全体` ; 5 catégories historiques identiques à la capture ; `Numberofmembers`, `Average`, pénalités de temps / pesée ; 14 équipes. | Export Casual d'apparence équivalente, **colonnes dépendantes du règlement**. | Le fichier n'établit pas un barème Casual réduit. Ne pas figer les cinq catégories dans tous les événements casual. |
| CSV billetterie Cachan 2026 | 37 billets, 11 commandes, 11 paires nom/prénom répétées ; toutes les lignes indiquent billet payé non supprimé. | Créer 37 **places** liées aux commandes ; remplir les identités réelles plus tard. | Nom et email décrivent le plus souvent l'acheteur, pas les 37 personnes réelles. |
| PDF `fiche des dechets spogomi.pdf` | 1 page contenant 3 fiches vierges identiques. Recyclable, non recyclable, verre, alu/acier, mégots en grammes. | Interface de pesée arbitre, impression facultative de secours. | Catégories différentes des deux tableaux ; aucune mesure remplie. |

## 2. Clés et granularité

| Objet d'échange | Une ligne / objet = | Clé minimale | Owner runtime candidat |
|---|---|---|---|
| `tickets_places.csv` | Place vendue | `place_id`, ref externe stabilisée à l'import | `spogomi_participants` (une ligne par place, identité initialement inconnue) |
| `composition_equipes.csv` | Affectation d'une place, jamais un regroupement nominatif | `(event_id, place_id)` | `spogomi_teams` + `spogomi_participants.team_id` |
| `mesures_pesees.csv` | 1 catégorie mesurée par version de soumission d'équipe | `(team_id, submission_version, category_code)` | `spogomi_result_submissions`, `spogomi_result_items` |
| `penalites.csv` | Une décision sportive versionnée | Référence décision/équipe/version | Règlement et arbitrage SPOGOMI existants |
| `classement_export_lignes.csv` | Résultat équipe×catégorie, projeté pour l'export | `(team_id, category_code, regulation_version)` | **Projection serveur de classement**, à intégrer (pas formule XLSX canonique) |

Les identifiants `PLACE-...`, `ORD-...`, `TEAM-...` présents dans le kit sont **strictement synthétiques**. Ne pas les utiliser en production. Le hash de la source n'est pas une preuve d'identité individuelle.

## 3. Mapping du CSV réel, sans exporter ses valeurs

| Entête exact du CSV source | Donnée normalisée | Règle |
|---|---|---|
| `N. Billet` | `place.external_reference` | Identifiant stable **par billet**, à gérer en privé. |
| `N. de commande` | `order_group_id` ou `group_preference` privée | Sert à grouper les places achetées ensemble ; **ne prouve pas une identité partagée**. |
| `N. de commande avancé` | fallback de commande après validation | Ne remplace pas silencieusement `N. de commande`. |
| `Nom participant`, `Prénom participant` | nom brut d'inscription, privé, éventuellement `display_name` provisoire | Répétition prouvée dans le CSV ; ne pas considérer comme 37 identités distinctes. |
| `Nom Acheteur`, `Prenom Acheteur`, `E-mail Acheteur`, `Mobile Acheteur` | contexte acheteur privé **si strictement nécessaire** | Aucun de ces champs n'est requis pour former automatiquement une équipe ; ne pas les publier. |
| `Code-barres` | contrôle optionnel de billet | Ne jamais exposer en URL ou dans les fixtures versionnées. |
| `Statut du billet`, `Supprimé` | état de validité commerciale | Ne pas confirmer une place annulée ; revoir la traduction des statuts avec l'organisateur. |
| `E-mail Participant` | contact privé potentiellement ambigu | Ne déduit jamais un compte Clerk ni une identité personnelle distincte. |
| Toute autre colonne financière, marketing ou facturation | **non importée** | Minimisation RGPD. |

**Important** : un fichier billetterie peut posséder un acheteur commun sur plusieurs places. L'application doit proposer ces places comme membres **à identifier** ; ne pas inventer de véritables personnes ou attribuer plusieurs comptes à la même identité provisoire.

## 4. Politique de composition — décision produit issue de la conversation

- **Priorité 1 :** conserver les places d'une même commande et constituer autant de trios que possible à l'intérieur de la commande.
- **Priorité 2 :** créer les équipes partielles à partir des restes par commande (par exemple 5 = 3 + 2), puis les compléter à partir des places isolées d'autres commandes.
- **Priorité 3 :** World Cup : proposer un maximum d'équipes complètes de 3, et conserver un reliquat non affecté plutôt que certifier une équipe non conforme.
- **Priorité 4 :** Casual : accepter des propositions de 2 à 4 lorsqu'elles sont compatibles avec la configuration **propre à l'événement**, en privilégiant les trios ; ne pas imposer de taille Casual universelle au runtime.
- Proposer une **prévisualisation**, pas une affectation définitive silencieuse ; l'organisateur corrige et confirme la composition.
- Le jour J : absents, arrivées et remplacements peuvent modifier la composition, mais après verrouillage/pesée il faut un parcours autorisé et audité, jamais un simple `team_id` modifié sans garde.
- **Ne jamais supprimer puis recréer les équipes** pour un simple rééquilibrage après qu'elles possèdent tokens, soumissions ou certifications : préserver les UUID et l'historique.

### Exemples de décomposition synthétique pour 37 places

Distribution issue des effectifs anonymisés (pas des identités) : `1×6 + 4×4 + 4×3 + 1×2 + 1×1 = 37`.

- **World Cup :** 10 trios complets à l'intérieur des commandes, puis 2 trios recomposés et 1 place non affectée → **12 équipes de 3 + 1 attente**.
- **Casual :** 10 trios complets à l'intérieur des commandes, puis 1 équipe de 4 et 1 trio recomposé → **11 équipes de 3 + 1 équipe de 4**.

Ce sont des **propositions algorithmiques** reproductibles, pas la composition officielle de Cachan.

## 5. Pesée numérique — une mesure = une catégorie d'une version

- Le formulaire lit les catégories actuelles du règlement de l'événement ; les trois nomenclatures du kit sont **observées, non fusionnées**.
- Saisir la masse en **grammes** (`mass_grams`), ne jamais convertir un poids de mégots en `direct_object_count`.
- `mass_grams: null` signifie non mesuré, `0` signifie mesure zéro ; idem pour `direct_object_count`.
- Conserver méthode, provenance, auteur habilité, horodatage, commentaires, version et statut.
- Après soumission, seule la certification par rôle autorisé transforme la mesure en résultat officiel ; conserver l'historique de correction.
- Les pénalités sportives sont **séparées** des masses ; une disqualification n'efface pas les déchets réellement collectés.
- Une équipe ne doit pas accéder aux pesées ou secrets d'une autre.

## 6. Barèmes : ce que les fichiers supportent, et ce qu'ils ne supportent pas

**Tableaux Excel/capture :** ordures ménagères 100 pts/kg ; piles/batteries 100 pts/kg ; emballages 250 pts/kg ; verre 120 pts/kg ; mégots 3000 pts/kg.

**PDF arbitre :** recyclable 25 pts/100g ; non recyclable 10 ; verre 12 ; alu/acier 25 ; mégots 300 pts/100g.

La conversion arithmétique d'un coefficient `points/100g` en `points/kg` ne valide pas l'équivalence des catégories (notamment `emballages` vs `recyclable` + `alu/acier`).

**Non prouvés par les sources :** coefficient officiel applicable aux éditions futures, catégories Casual réellement réduites, exclusions, règles d'arrondi, pénalités de retard, départages, éventuels bonus, règles exactes de pesée, règlement d'éligibilité.

**Obligation runtime :** `regulation_status=incomplete` jusqu'à saisie et validation explicite de tous ces paramètres par l'organisateur. Aucun affichage « officiel » pour un résultat simplement calculable.

## 7. Génération automatique du classeur final

Le bouton `Exporter` apparaît au bon stade de l'événement, lorsque la projection officielle est disponible et autorisée. L'export Excel doit :

1. Reprendre titre, date, mode et référence/version de règlement ;
2. Générer dynamiquement une double colonne **masse kg / points** pour chaque catégorie effectivement réglementée ;
3. Montrer équipe, rang officiel, points bruts, pénalités certifiées, score final, masse totale (selon périmètre certifié) ;
4. Ajouter les informations Casual vérifiées (`membres`, éventuellement moyenne si explicitement définie par le règlement) ;
5. Garder un onglet de traçabilité (provenances, mesures, révisions) **sans roster privé dans un export public** ;
6. Échapper les valeurs initiées par `=`, `+`, `-`, `@` afin d'empêcher les injections de formules en cellules texte ;
7. Garantir que tableau à l'écran, export CSV long format et XLSX proviennent du même calcul serveur ;
8. Séparer `0`, `null`, `preview`, `certified` et `official`.

Les classeurs livrés ici sont des **maquettes de structure**, sans scores inventés et sans classement calculé. Les seules formules contenues dans la ligne TOTAL sont des sommes de présentation ; jamais source canonique du score.

## 8. Tests d'acceptation à construire à partir du kit

- Billets identiques acheteur mais références distinctes : 37 places créées, pas de déduplication par nom.
- Reimport du même CSV : pas de doublons.
- Commande de cinq : trio + binôme à compléter.
- Commande de six : deux trios.
- Préférence World Cup : 12 trios, 1 place en attente ; aucun résultat officiel avec effectif non conforme si le règlement l'exige.
- Préférence Casual : 11 trios + 1 équipe de quatre, aucun membre perdu.
- Absence le jour J : effectif `registered` distinct de `present`; composition modifiable sous contrôle approprié.
- Toutes les pesées nulles : pas de score officiel ; mesure zéro explicite reste zéro.
- Mégots massés mais non comptés : ratio mégots/personne non comparable.
- Double soumission, changement d'arbitre, refus, correction : idempotence et historique.
- Export : colonnes dynamiques, aucune duplication catégorie imbriquée, pénalités/arrondis server-only, formule injection neutralisée, roster non exposé.
- Révision de résultats certifiés : l'export et la consolidation convergent sur la même révision.

**Aucune requête Supabase d'écriture, migration ou publication Git n'est réalisée par ce kit.**
