# PLAN | Calque communautaire de pollution et annotations administratives

**Statut documentaire : `PLAN`, non implémenté.**

**Objet :** réserver un chantier post-stabilisation de la heatmap prédictive pour Paris intra-muros. Ce document fixe les intentions produit, les contrats souhaités, les questions à vérifier, les lots d'intégration et la condition de clôture. Il ne décrit pas une API, une table ou une permission actuellement déployée.

**Chemin cible dans le dépôt :** `documentation/plans/heatmap-annotations-communautaires.md`.

**Dépôt consulté :** `maxd4/CleanmyMap`, branche `main`, révision `0efc4903c25198d00cc8c1cf7704c4f6260c062a` du 1er novembre 2026. Les chemins et capacités devront être revérifiés sur `main` au début de l'intégration.

**Entrée de conception :** proposition utilisateur de calque de pollution de la cartographie communautaire, sélection de tronçons/pièces de surface, cinq classes, quatre commandes administratives et signalement persistant jusqu'à intervention documentée.

## 1. Objectif et déclenchement du chantier

### 1.1. Finalité

Une fois la heatmap prédictive stabilisée, l'intégrer comme calque facultatif de la carte communautaire. Les administrateurs habilités pourront sélectionner une portion précise de rue ou un polygone d'espace public et :

1. augmenter d'une tranche de 20 points son risque estimé opérationnel ;
2. diminuer d'une tranche de 20 points ce risque ;
3. déclarer un lieu « Propre » avec une observation datée ;
4. déclarer un lieu « Pollué » et produire un signalement opérationnel visible, **sans augmenter artificiellement le score théorique**.

L'objectif est de corriger des situations connues localement, notamment une ruelle fréquemment polluée malgré un faible prior théorique, et de faire contribuer ces annotations à la sélection future des itinéraires. La présence d'une observation ne constitue pas une calibration scientifique automatique.

### 1.2. Condition de démarrage (`ENTRY GATE`)

Ne pas implémenter la fonction avant qu'il existe un contrat stable et réellement validé pour :

- un graphe de tronçons piétons géographiquement référencés, versionné et consultable ;
- deux scores prédictifs distincts et normalisés, mégots et déchets, à la maille exploitée par la carte et le planner ;
- un calcul reproductible de `mixte`, le traitement des valeurs manquantes et la traçabilité du modèle ;
- un rendu cartographique et un chargement borné des géométries ;
- une optimisation d'itinéraire qui consomme les mêmes références spatiales que la heatmap ;
- des tests réels et des métriques de performance du pilote parisien.

« Stable » signifie ici contrat documenté, tests exécutés, couverture spatiale connue et absence de divergence entre carte et générateur. Aucun statut `CURRENT` ne peut être déduit du seul présent plan.

### 1.3. Périmètre et hors périmètre initial

**Pilote :** Paris intra-muros, dans les emprises publiques accessibles et dont la géométrie est réellement disponible ; priorité aux tronçons, puis aux places, esplanades et zones publiques représentées par des polygones.

**Hors périmètre initial :** édition citoyenne libre des coefficients, droits implicites donnés aux organisateurs, données privées de fréquentation, extrapolation automatique du nettoyage aux deux côtés de la rue, suppression de l'historique des signalements, calibration scientifique automatique à partir de clics administrateurs, support national sans graphe ni données.

## 2. Quatre concepts à ne jamais fusionner

| Concept | Owner cible | Ce qu'il apporte | Ce qu'il ne prouve pas |
|---|---|---|---|
| Risque prédictif de base | Modèle et snapshot de risque versionnés | Prior spatialisé `waste` / `cigaretteButts` | Présence actuelle de déchets |
| Correction humaine durable | Annotation administrative liée à la géométrie | Ajustement explicite du score exploité par le planner | Mesure scientifique ou pollution constatée |
| Observation terrain | Flux canonique `spot` / `clean_place` lorsqu'applicable | État signalé, auteur, date, preuves et cycle de vie | Quantité exacte ou nettoyage effectif |
| Couverture d'une action | Contrats de géométrie et de résultat d'action | Preuve possible d'intervention sur une portion | Nettoyage de tout l'espace traversé par un trajet |

En particulier :

- `predicted` ne devient jamais `observed` à la suite d'une correction manuelle.
- Le passage de la trace prévue (`planned`) ou routée (`network`) ne constitue pas une preuve de nettoyage.
- Une observation « Propre » n'efface pas une propension structurelle à la repollution.
- Une observation « Pollué » n'augmente pas automatiquement `wasteRisk`, `cigaretteButtRisk`, les poids scientifiques IRIS ou les coefficients morphologiques.
- Le score de pollution constatée sur les actions, le score théorique d'un tronçon et le pourcentage relatif du potentiel d'un itinéraire à l'optimum parisien sont **trois indicateurs différents**.

## 3. Normalisation et cinq niveaux de pollution

### 3.1. Contrat de score

Chaque entité géographique admissible conserve au minimum :

- `baseWasteRisk` et `baseCigaretteButtRisk` : scores de base dans `[0,100]`, ou `null` en l'absence de source ;
- `adjustedWasteRisk` et `adjustedCigaretteButtRisk` : scores opérationnels après correction administrative ;
- `baseMixedRisk` et `adjustedMixedRisk` : moyenne arithmétique des deux scores correspondants, sans inventer une catégorie absente ;
- versions du modèle, des données, des règles et de la géométrie ;
- provenance et confiance du score initial **distinctes** de l'origine de la correction.

Les **multiplicateurs de proxy** du document de heatmap polarisée ne se convertissent pas directement en pourcentages. La normalisation doit être appliquée **au score final du modèle** avec ses références versionnées. Un coefficient brut `3,35` ne veut pas dire `335 %`, ni une pollution mesurée trois fois plus grande.

### 3.2. Classes d'affichage

| Niveau | Intervalle exact du score | Libellé proposé |
|---|---|---|
| `1` | `0 <= s < 20` | Très faible |
| `2` | `20 <= s < 40` | Faible |
| `3` | `40 <= s < 60` | Modéré |
| `4` | `60 <= s < 80` | Élevé |
| `5` | `80 <= s <= 100` | Très élevé |

Règle exacte pour une valeur connue : `level(s) = min(5, floor(s / 20) + 1)`. Un score `100` appartient au niveau `5`. Un score `null` reste **inconnu**, jamais niveau `1`.

Les classes sont communes à la visualisation, avec trois modes `mégots`, `déchets`, `mixte`. En revanche, les deux risques restent distincts pour le calcul. `mixte` est **dérivé** : aucune correction autonome du score mixte n'est permise.

**Important :** les cinq classes de risque spatial ne sont pas les seuils orange/rouge du **potentiel relatif d'un itinéraire**. Ces derniers relèvent de la policy du générateur et ne doivent pas être réutilisés pour classer les rues.

### 3.3. Correction en pas de 20 points

Politique produit candidate, à versionner :

```text
S_base(e,k)         = score normalisé du modèle, en points sur 100
N_admin(e,k)        = décalage entier administratif validé
S_corrigé(e,k)      = clamp(S_base(e,k) + 20 * N_admin(e,k), 0, 100)
S_mixte_corrigé(e)  = (S_corrigé(e,mégots) + S_corrigé(e,déchets)) / 2
```

Les clics `+` et `-` modifient `N_admin` **pour une catégorie sélectionnée**, ou pour les deux catégories si l'administrateur choisit explicitement « Les deux ». La moyenne mixte est ensuite recalculée. L'écriture doit rester impossible lorsque la base nécessaire est `null`, sauf politique distincte et explicitement approuvée pour une correction sans base. **Ne jamais transformer `null` en zéro.**

- Exemple illustratif : `35 -> 55` après une correction `+1` ; `55 -> 35` après son annulation.
- Exemple de saturation : `92 -> 100` après `+1`, sans prétendre avoir ajouté exactement 20 points visibles.
- Le pas de 20 points est une **décision UX**, non une variation de 20 % de quantité réelle.
- Le « niveau » affiché est recalculé à partir du score, sans modification supplémentaire de celui-ci.
- Le journal conserve la valeur d'origine, le décalage total, l'état effectif avant/après, la justification et le modèle de référence.

Préférer une **valeur de décalage effective et un journal append-only** à l'accumulation aveugle de modifications contradictoires. Prévoir `annuler / rétablir` une correction autorisée, sans effacer l'audit.

### 3.4. Gestion des évolutions du modèle

Quand le prior scientifique ou le réseau change :

- ne jamais réécrire les anciennes observations ni leur version ;
- conserver l'annotation géographique et la valeur historique du décalage ;
- recalculer la projection corrigée seulement si la cible spatiale reste identifiable ;
- afficher les annotations à **revoir** lorsque la nouvelle base, la segmentation ou le sens de la correction ne sont plus comparables ;
- tester explicitement les saturations à `0` et `100` et les changements de classe.

Ne pas renormaliser Paris à chaque clic administratif. La référence du modèle doit être stable dans sa version ; les corrections localisées ne doivent pas modifier artificiellement tous les autres scores.

## 4. Calque de la cartographie communautaire

### 4.1. Présentation

- Ajouter un calque facultatif « Pollution prédite » à la carte communautaire existante, avec un filtre `Mégots / Déchets / Mixte`.
- Rendu vectoriel à l'emplacement des voies publiques et surfaces, et **non** interpolation floue sur les immeubles ou espaces privés.
- Afficher cinq classes de risque avec une légende constante. L'absence de données doit posséder un style neutre distinct.
- Réserver le **vert des lieux propres** aux observations `clean_place` conformément à `documentation/product/methodologie-carte-actions.md` ; ne pas utiliser le même vert pour la classe de risque très faible.
- Superposer les observations actives « Pollué », les lieux propres datés et les corrections manuelles, sans confusion visuelle entre signalement et modèle.
- Popover au clic : type de géométrie, risque initial et corrigé pour chaque catégorie, niveau, preuve ou absence de preuve, date, confiance, version et éventuel état observé.
- La lecture publique ne doit pas révéler de détails privés de modération ou de géolocalisation personnelle.

### 4.2. Sélection de géométrie

**Mode portion de rue :** sélectionner une ou plusieurs arêtes du graphe ou une **sous-portion précise** entre deux positions projetées sur le réseau. Enregistrer une référence stable par version de graphe et, quand la portion n'est pas égale à l'arête entière, sa géométrie ou son intervalle linéaire. Ne jamais utiliser seulement le nom de rue ou son centroïde.

**Mode surface :** sélectionner un polygone public existant ou dessiner une emprise polygonale valide, avec trous et multi-polygones selon les primitives réellement supportées. Réduire l'application de la correction au domaine admissible ; ne pas supposer qu'une place est intégralement accessible ou nettoyable.

**Arbitrages d'UI :** carte pan/zoom, sélection visible, géométrie précise en surbrillance, aperçu de l'emprise affectée, garde contre clic involontaire, confirmation et retour arrière. Les objets non admissibles, trop grands, auto-intersectés ou hors Paris restent non modifiables avec une explication. Les limites de longueur et de surface seront définies à l'implémentation après mesure de performance.

### 4.3. Cas géographiques délicats

- Une rue peut être coupée, fusionnée ou changée de référence lors d'un import OSM : réconcilier par géométrie avec preuve de correspondance, sinon suspendre l'annotation et demander une revue.
- Un tronçon peut croiser plusieurs zones IRIS : respecter ses subdivisions réelles, sans rattachement abusif par centroïde.
- Un polygone peut chevaucher plusieurs tronçons, mais ne doit pas transformer une surface non routable en chemin fictif.
- Ne pas inférer `left`, `right`, `single`, un accès sûr ou le trottoir réellement nettoyable à partir d'une ligne de réseau ; respecter `street-cleaning-corridor.ts`.
- En cas de superposition d'annotations concurrentes, définir **une seule règle de résolution déterministe**, sans addition non bornée de corrections. Conserver les conflits pour revue.

## 5. Quatre commandes administratives et leur sémantique

| Commande visible | Mutation voulue | Pas de mutation sur | Précondition |
|---|---|---|---|
| `+ Ajouter une tranche` | Incrémenter la correction administrative d'un pas de `+20` points | Score scientifique brut, observations | Sélection valide, base disponible, permission et justification |
| `- Retirer une tranche` | Décrémenter la correction administrative de `-20` points | Score scientifique brut, observations | Idem |
| `Propre` | Créer ou qualifier une **observation datée** de lieu propre par la voie canonique | Correction structurelle, score scientifique brut | Attestation explicite et géométrie admissible |
| `Pollué` | Créer ou qualifier un signalement `spot` actif lié à la géométrie, avec catégorie(s) et preuve | Correction structurelle, score scientifique brut | Observation documentée, géométrie, statut contrôlé |

Les boutons « Propre » et « Pollué » **ne sont pas des boutons de calibration**. Leur effet opérationnel sur le générateur peut être important, mais doit passer par la couche des observations avec son état de preuve et sa temporalité.

### 5.1. Prévention des abus et des erreurs

- Un administrateur choisit **mégots**, **déchets** ou **les deux** avant correction ; le mixte reste dérivé.
- L'interface affiche un aperçu `avant -> après`, la portée géographique, le motif et les conflits éventuels.
- Une opération ne peut pas être rejouée deux fois par accident : clé d'idempotence côté serveur et audit d'événement.
- Un clic sur un calque en lecture publique n'accorde aucun privilège ; les commandes d'écriture ne sont disponibles qu'aux acteurs réellement autorisés.
- Les modifications répétitives inhabituelles doivent être auditables et éventuellement soumises à confirmation renforcée. Aucun verrouillage basé sur une métrique inventée n'est figé ici.

## 6. Stockage, preuves et frontières des sources

### 6.1. Réutiliser l'existant

**Faits observés au moment de la rédaction :** `public.trash_spotter_spots` accepte les types `spot` et `clean_place`, les statuts `new`, `validated`, `cleaned` et des géométries dérivées `point`, `polyline`, `polygon`. La carte d'actions et le domaine signalement disposent déjà de contrats de provenance et de modération. Le fait qu'un schéma stocke un polygone ne prouve pas que l'UI actuelle permette de l'éditer avec la précision souhaitée.

**Décision cible :**

1. Utiliser les contrats **canoniques** du domaine `trash_spotter_spots` pour les états terrain `Pollué` et `Propre` lorsque leurs champs et workflows conviennent ; étendre ces contrats plutôt que créer un second registre de signalements.
2. Créer, **uniquement si aucun propriétaire équivalent n'existe après inspection**, une persistance d'annotations administratives pour les **décalages durables de score**. Cette persistance ne doit pas devenir une deuxième source de vérité du risque ou des observations.
3. Conserver les événements d'édition en append-only et exposer une projection courante dérivée, atomiquement publiée, pour la carte et le planner.
4. Ne pas intégrer les annotations administratives aux métriques de collecte, aux résultats de terrain ni aux références scientifiques historiques.

### 6.2. Contrat logique d'une correction

Proposition de champs, **pas un schéma SQL imposé** :

```text
id, target_geometry_kind, target_geometry, graph_version, target_segment_ids
risk_family: waste | cigarette_butts | both
admin_delta_steps: integer (pas de 20 points, policy versionnée)
base_model_version, base_snapshot_version, annotation_policy_version
status: active | review_required | superseded | revoked
reason, evidence_references, created_at, updated_at, actor_id, operation_id
```

Le score corrigé est une **projection dérivée** à partir du snapshot et de la correction active. Ne pas stocker un deuxième score scientifique mutable à la main.

### 6.3. Contrat logique d'une observation

À raccorder au domaine signalement existant :

```text
source: spot | clean_place
selected_geometry, observed_at, category, evidence, validated_status
resolved_at?, resolution_reason?, resolving_action_id?, proven_cleaned_geometry?
```

La liste ne définit pas une migration à créer mot pour mot. L'ownership, les statuts, médias, droits et projections publiques doivent rester ceux du domaine existant ou être étendus sans duplication. Les informations sensibles du modérateur ne doivent pas être exposées sur la carte publique.

## 7. Cycle de vie du bouton « Pollué »

### 7.1. Création

- Clic admin sur une portion ou un polygone, choix `Pollué` et catégorie(s) constatée(s).
- Saisie d'une attestation ou preuve conforme au contrat des signalements, date et géométrie exacte.
- Enregistrement et publication selon le parcours autorisé ; **ne pas créer de nouveau score**.
- Calque et générateur signalent une cible opérationnelle observée, distincte de la priorité prédite.

### 7.2. Persistance

Le signalement **reste actif jusqu'à résolution suffisamment documentée**, même si la prédiction de base est faible. Il n'expire pas automatiquement au prochain recalcul de la heatmap. Une invalidation pour erreur, doublon ou abus est néanmoins possible selon le processus de modération et doit rester auditée.

### 7.3. Résolution après une action

**Ne jamais conclure « nettoyé » sur le seul passage d'un itinéraire.** Conditions minimales à confronter aux contrats de terrain réels :

1. action effectivement terminée, validée ou approuvée selon le workflow approprié ;
2. preuve de collecte ou de nettoyage explicite et de la catégorie concernée, non déduite d'une polyline ;
3. géométrie de couverture observée admissible, ou attestation territoriale assez précise pour relier la portion nettoyée ;
4. chevauchement spatial non ambigu entre la couverture *nettoyée* et la zone signalée ;
5. absence de conflit de provenance ou de chronologie ; sinon revue administrative.

Si seule une sous-portion est démontrée nettoyée, ne clôturer que cette portion et conserver le reste actif : scinder la géométrie ou conserver une couverture résiduelle équivalente **si** le domaine géospatial le permet de façon sûre. Une preuve de nettoyage des déchets n'éteint pas automatiquement un signalement distinct de mégots.

La clôture doit être idempotente, auditée, liée à l'action et **ne jamais supprimer le signalement historique**. Le contrat courant connaît `cleaned` ; vérifier son usage précis avant toute évolution.

### 7.4. Observation « Propre »

Une déclaration datée de propreté est une observation locale, **pas un risque prédictif égal à zéro**. Elle peut réduire temporairement l'intérêt opérationnel d'une zone selon une policy séparée, uniquement avec date et contexte interprétables. Une observation de pollution postérieure ne doit pas être masquée par un ancien état propre ; en présence de preuves contradictoires, afficher ou traiter explicitement le conflit.

## 8. Effet exact sur l'optimiseur d'itinéraires

### 8.1. Chaîne de décision

```text
Snapshot de risque scientifique / heuristique, versionné
              |
              v
    Correction administrative spatiale
       (+/- n x 20 points)             Observations validées
              |                          (Pollué / Propre)
              v                                |
  Score opérationnel corrigé                   |
              +---------------+----------------+
                              v
           Planner : priorité + additionnalité
                + accessibilité + budget
                              |
                              v
                 Itinéraire et trace auditable
```

- Une correction de `+20` sur un tronçon augmente **son risque opérationnel corrigé**, mais ne promet pas une hausse de 20 points du score relatif de l'itinéraire. Celui-ci dépend de l'ensemble des segments et de la référence parisienne.
- `Pollué` augmente la pertinence d'une **cible observée encore actionnable**, selon la politique d'admission du planner ; ne pas ajouter en parallèle un bonus caché au risque de base.
- `Propre` peut influencer la disponibilité opérationnelle temporaire, sous conditions de fraîcheur et de preuve ; ne pas annuler l'hypothèse de repollution à long terme.
- Conserver `pollutionPriority`, `volunteerAdditionality`, sécurité, distance, durée et provenance comme axes séparés.
- Éviter le double comptage d'une même zone sous les formes `predicted`, `observed`, correction et autre source importée ; conserver la décision explicable.
- L'optimiseur multi-groupe doit éviter le nettoyage redondant d'une même portion sans confondre un tronçon commun de déplacement avec une couverture de nettoyage.

### 8.2. Polygones et surfaces non routables

Un polygone peut représenter une cible de collecte de surface. Il **ne constitue pas automatiquement un chemin**. Le planner doit sélectionner une entrée et des déplacements piétons admissibles, ou considérer la cible non routable. Ne jamais produire un trait direct traversant une emprise non parcourable.

### 8.3. Contraintes et seuils d'alerte

Les corrections ne peuvent lever aucune restriction de sécurité, d'autorisation, de météo ou de budget. Les warnings orange/rouge du potentiel relatif parisien, s'ils sont implémentés, recalculent leur valeur à partir du **parcours effectivement retenu** et des mêmes versions de scores. Une alerte liée à l'observation « Pollué » reste distincte d'un warning de faible risque théorique.

## 9. Édition sécurisée, journal et recalcul local

### 9.1. Autorisations

- Contrôle explicite **côté serveur**, fondé sur les capacités et rôles réellement autorisés, en particulier `admin` / `max` si la politique de permissions en vigueur le confirme ; `elu` ou `coordinateur` ne reçoit aucun droit par analogie.
- Ne pas confier une écriture directement au client ni dériver la permission de l'affichage du bouton.
- Vérifier la cible géographique et l'identifiant soumis, les limites de taille, l'intégrité de l'emprise, la version d'annotation et les droits de modification/révocation.
- Auditer RLS, grants, `service_role`, confidentialité et anti-IDOR sur la nouvelle projection ou API. Les migrations éventuelles restent append-only dans `apps/web/supabase/migrations/`.

### 9.2. Historique et concurrence

Chaque mutation a un auteur authentifié, une date, un motif, une géométrie, une catégorie, l'état avant/après, une identité de policy et une clé d'idempotence. Deux admins éditant la même portion ne doivent pas écraser silencieusement leur travail : contrôle de version, conflit explicite ou consolidation autorisée. Le retrait d'une correction ne supprime pas sa trace historique.

### 9.3. Rafraîchissement

- Répercuter une correction ou observation sur les **segments intersectés uniquement** ; si la géométrie change, invalider l'ancienne **et** la nouvelle emprise.
- Invalidation durable, idempotente, avec reprise et publication atomique de la projection.
- Conserver la dernière version publiée en cas d'échec ; signaler temporairement un décalage de fraîcheur plutôt que livrer une carte incohérente.
- La carte, la couche de risque et le planner doivent lire **la même version publiée** ; ne pas créer un cache admin concurrent.
- Recalcul global seulement si le graphe, la normalisation ou le modèle scientifique le nécessite.

## 10. Lots futurs d'intégration

| Lot | Périmètre borné | Sortie requise |
|---|---|---|
| A. Contrat de classes et corrections | Deux scores, mixte, cinq classes, décalages ±20 et cas `null` | Scorer pur et tests de frontières |
| B. Géométries et persistance admin | Sélection de sous-tronçons/polygones, conservation de provenance, audit, AuthZ et conflits | API/migration strictement nécessaires et tests |
| C. Calque communautaire | Couches vectorielles, légende, lecture des scores et quatre actions administratives | Carte publique lisible, édition protégée |
| D. Observations actives et clôture | Réemploi `spot` / `clean_place`, géométrie nettoyée, clôture partielle et chronologie | Cycle de vie sans faux nettoyage |
| E. Connexion au planner/cache | Scores corrigés, spots prioritaires, recalcul local, multi-groupes, diagnostics | Carte et itinéraires cohérents sur la même version |
| F. Validation terrain et publication | Scénarios réels, limites de performance, revue des permissions, mise à jour documentaire | Vérification de l'objectif et arrêt du chantier |

Les lots sont un **découpage cible**, pas une autorisation de migration ni un diagnostic de code encore non écrit. Au démarrage, vérifier l'absence d'équivalent et adapter l'allowlist aux owners réels. Éviter la création d'abstractions ou de documents concurrents.

## 11. Scénarios d'acceptation obligatoires

1. **Ruelle sous-estimée :** `waste=35`, correction `+1` -> `55` ; classe `2 -> 3`. Le score de base reste `35`.
2. **Saturation :** `cigaretteButts=92`, correction `+1` -> `100` ; retrait revient au résultat attendu, avec audit complet.
3. **Décorrélation des catégories :** correction mégots uniquement ; déchets inchangés, mixte recalculé par moyenne.
4. **Information absente :** `waste=null` ; aucune conversion silencieuse en `0`, aucun calcul mixte mensonger.
5. **Observation polluée :** ajout d'un `spot` validé ; le risque théorique reste inchangé, le planner voit une cible observée distincte.
6. **Action simplement planifiée :** sa polyline traverse un spot actif ; **aucune clôture**.
7. **Action terminée mais preuve insuffisante :** trace GPS de passage sans attestation de nettoyage ; **aucune clôture automatique**.
8. **Nettoyage partiel documenté :** seule la portion réellement nettoyée est résolue ; le reste demeure actif.
9. **Conflit chronologique :** ancienne observation « Propre » puis nouveau signalement « Pollué » ; l'ancien état ne masque pas le nouveau.
10. **Polygone non routable :** visible comme surface, mais aucun trajet inventé à travers les obstacles.
11. **Réimport OSM :** changement d'identifiant d'arête ; réconciliation étayée ou correction suspendue pour revue, sans perte de l'audit.
12. **Deux admins :** éditions concurrentes ; détection de conflit, pas de dernière écriture silencieuse.
13. **Non-admin :** aucun droit de modification via l'UI ou une requête HTTP forgée.
14. **Multi-groupe :** la correction influe sur la priorité d'une portion, pas sur la duplication de couverture ni sur la validité des budgets.
15. **Régression cartographique :** `clean_place` conserve son traitement visuel spécifique ; les cinq niveaux de risque n'utilisent pas sa couleur de preuve.
16. **Publication atomique :** aucune carte ni recommandation ne mélange scores de deux versions incompatibles.

## 12. Conditions de clôture (`STOP CONDITION`)

Le chantier sera considéré complet seulement lorsque :

- les quatre commandes fonctionnent sur sous-tronçons et polygones admissibles ;
- les corrections sont bornées, réversibles, auditées, et n'écrasent pas le modèle scientifique ;
- « Pollué » reste visible jusqu'à résolution attestée et ne disparaît pas sur simple passage ;
- « Propre » conserve une temporalité et ne devient pas un `0` prédictif permanent ;
- l'optimiseur et la carte utilisent les mêmes projections versionnées ;
- la sécurité des rôles, des mutations et des données est vérifiée par des tests appropriés ;
- les références de modèle, contraintes et écarts de données sont présentés honnêtement ;
- les tests pertinents ont réellement été exécutés et les défauts du lot corrigés ;
- la documentation canonique est synchronisée et le plan est requalifié en historique ou fermé.

Aucune affirmation de test réussi, de migration appliquée ou de comportement déployé n'est faite par ce document.

## 13. Sources canoniques à relire avant exécution

- `documentation/architecture/paris-pressure-risk-model.md` : calcul et provenance des risques IRIS existants.
- `documentation/architecture/paris-municipal-cleaning-serviceability.md` : serviceabilité municipale et limites.
- `documentation/architecture/route-predicted-risk-integration.md` : observations et prédictions dans le planner.
- `documentation/architecture/methodologie-creation-itineraire.md` : routage, budgets, couloirs et preuves opérationnelles.
- `documentation/architecture/data-governance.md` : `trash_spotter_spots`, observations, géométrie et mutations.
- `documentation/product/methodologie-carte-actions.md` : cartographie communautaire, propreté et repollution.
- `documentation/security/authz-authn-regles.md` : permissions et frontières API.
- `apps/web/src/components/actions/map/README.md` : composition de la carte et présentation des géométries.
- `apps/web/src/lib/route/street-cleaning-corridor.ts` : distinction trajet réseau / corridor réellement nettoyable.
- `apps/web/src/lib/actions/map/observed-coverage.ts` : validation des couvertures observées.
- `apps/web/src/lib/actions/signalement/` et `apps/web/src/app/api/admin/moderation/` : flux signalement et modération.
- `apps/web/supabase/AGENTS.md` et `documentation/AGENTS.md` : règles scoped de migration et de documentation.
- **Proposition de heatmap précédemment livrée au chat**, destinée à `documentation/architecture/paris-street-pollution-heatmap.md` : ne pas la présumer déjà intégrée à `main` tant que le fichier n'y figure pas.

**Décision finale du plan :** créer une correction humaine **du risque opérationnel** et une couche **d'observations terrain** séparée, avec quatre commandes administratives sur des géométries précises. Ne commencer qu'une fois le calcul et l'affichage de la heatmap stabilisés, puis arrêter dès que les critères ci-dessus sont démontrés.
