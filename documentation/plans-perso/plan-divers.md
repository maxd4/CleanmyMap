
**1. Résoudre les décisions humaines encore ouvertes.**

La passation identifie plusieurs points non verrouillés : 

* `performance_longue_base_v1` : glucide pré-effort oui avec plusieurs grammes d'isomaltulose;
* `force_aigue_base_v1` : ratio réel de citrulline malate à documenter, sur la boite il y a écrit 2:1 ;
* `altitude_support_quotidien_v1` : méthode fiable de microdosage ou galénique ;
* potassium : masse matière selon la forme fournisseur et le CoA ;
* magnésium : actuellement 310mg de magnésium citrate actif pour 2g de poudre ;
* nitrates : 570mg de nitrates pour 10g de poudre ;
* ashwagandha : standardisation à relier au produit réellement acheté KSM-66 ;
* conditions précises d'activation du support micronutritionnel.

C'est probablement **le travail le plus important que nous pouvons faire ensemble maintenant**, parce que Codex pourra ensuite implémenter des décisions propres au lieu de devoir travailler autour d'incertitudes.

**2. Faire l'audit scientifique recette par recette.**

Pour chaque `recipeSpecification`, nous pouvons vérifier ensemble :

```text
ingrédients présents
-> dose
-> niveau de preuve
-> intérêt réel dans cette recette
-> timing
-> compatibilité avec les autres composants
-> statut : obligatoire / conditionnel / séparé / exclu
-> faisabilité réelle de fabrication
```

Les sept recettes actuelles sont déjà définies ; l'objectif ne serait donc pas de les réinventer, mais de vérifier leurs dernières zones faibles avant que tout le moteur, le questionnaire et la 3D ne se construisent dessus. 









**4. Exploiter tes prototypes et tests terrain.**

Tu as déjà une valeur que le dépôt seul ne peut pas produire : les retours des vrais utilisateurs.

Nous pouvons analyser :

* les résultats du questionnaire des testeurs ;
* les différences placebo / performance ;
* la tolérance digestive ;
* le goût ;
* la dissolution ;
* les effets perçus ;
* les éventuels signaux contradictoires ;
* les formulations à conserver, modifier ou retester.

Ce serait une couche de **preuve terrain**, à ne pas confondre avec une preuve scientifique, mais extrêmement utile pour la maturité réelle du produit.

**5. Préparer les actifs visuels de la future 3D.**

C'est directement lié à notre travail récent sur les photos de poudres. Le backlog 3D est explicitement rangé dans `plan/plus tard/`, donc son implémentation peut attendre.

Mais nous pouvons déjà construire un référentiel réel :

```text
ingredientId
photo sans flash
photo avec flash si utile
couleur réelle
finesse
densité visuelle
comportement en tas
comportement à la chute
tendance à faire des poussières
agglomération
texture
```

À terme, une petite vidéo de chute par ingrédient améliorerait encore la fidélité physique, mais les photos suffisent pour commencer le travail de référence visuelle.

**6. Concevoir l'expérience client sans coder.**

Nous pouvons simuler de vrais profils :

> « Je prépare un marathon en 3 h, digestion sensible, forte sudation, caféine standard. Que voit l'utilisateur ? Que décide le moteur ? Que contient la boîte ? Comment est-ce expliqué ? »

Puis faire de même pour :

* HYROX ;
* ultra-trail ;
* 400 m ;
* boxe ;
* récupération nocturne ;
* double séance ;
* force maximale ;
* préparation générale avec renforcement ;
* altitude ;
* acclimatation à la chaleur.

Cela permettrait de détecter des problèmes conceptuels **avant que Codex ne les encode**.





2. Pour chaque recette on va devoir fixer :

   * ingrédients obligatoires ;
   * ingrédients conditionnels ;
   * ingrédients exclus ;
   * doses de base ;
   * plages autorisées ;
   * statut de chaque ingrédient ;
   * protocoles séparés ;
   * modules séparés ;
   * interactions et doublons ;
   * forme galénique ;
   * conditionnement.

3. **Seulement ensuite construire les règles de personnalisation**, par exemple :

   * chaleur → augmentation électrolytes ;
   * forte sudation → calibration sodium/chlorure ;
   * digestion sensible → réduction, exclusion, dilution ou fractionnement ;
   * caféine choisie → ajout séparé ;
   * sans créatine → exclusion ;
   * poids → uniquement pour les éléments réellement pondéraux ;
   * discipline et durée → famille et sous-mode ;
   * traitements/compléments → exclusions, alertes ou revue ;
   * cycle, masters, ménopause, para-endurance → contexte uniquement, sauf conséquence explicite et justifiée.




















À partir de `donnees-metier/formulation/registre-ingredients.csv`, construis les architectures de recettes idéales sans appliquer les contraintes de coût, de MOQ ou de disponibilité actuelle au détail.

## Objectif

Déterminer la composition théorique optimale de chaque recette avant adaptation au prototype.

## Recettes à traiter

Priorité :

1. `recuperation_standard`
2. `performance_moyenne`
3. `performance_courte`
4. `performance_longue`
5. `preworkout_charge`

Traiter ensuite uniquement si les sources sont suffisantes :

* `recuperation_chaleur`
* `entrainement_chaleur`
* `preparation_generale`
* `altitude_jour`
* `altitude_soir`
* `support_micronutritionnel`

## Méthode

Pour chaque recette :

* définir son objectif physiologique précis ;
* identifier les leviers nécessaires ;
* sélectionner le plus petit nombre d’ingrédients couvrant ces leviers ;
* comparer les candidats ayant des fonctions proches ;
* éliminer les redondances sans bénéfice additionnel clair ;
* distinguer les ingrédients de cœur, contextuels et séparés ;
* distinguer les prises aiguës, quotidiennes et cycliques ;
* signaler les ingrédients dont la dose efficace rend la recette trop lourde ou incompatible avec le timing ;
* ne pas fixer encore la dose produit définitive lorsqu’une décision scientifique reste ouverte.

## Livrable

Créer `donnees-metier/formulation/recettes-ideales.csv` avec :

* `recipeId`
* `ingredientId`
* `role`
* `necessite`
* `statutDansRecette`
* `alternativePrincipale`
* `raisonInclusion`
* `raisonExclusionAlternative`
* `effetAiguOuCycle`
* `galenique`
* `timing`
* `dosePreuveMin`
* `dosePreuveMax`
* `doseIdealProposee`
* `niveauConfiance`
* `decisionStatus`
* `sourcePaths`

Valeurs de `statutDansRecette` :

* `core`
* `contextual`
* `separate`
* `optional`
* `experimental`
* `excluded`

Présenter les arbitrages humains sous forme de choix A/B clairs, sans multiplier les variantes.

## Contraintes

* Une recette idéale n’est pas une recette contenant tous les ingrédients prometteurs.
* Un ingrédient ne doit être inclus que s’il apporte une fonction distincte ou un bénéfice additionnel défendable.
* La sécurité, le timing, la masse et la galénique restent des contraintes, même si le coût et le sourcing sont temporairement ignorés.
* Les ingrédients expérimentaux ne doivent pas entrer dans la version idéale principale.
* Ne pas modifier le catalogue exécutable avant validation humaine.







remplir en priorité :

statutIdeal
rolesPossibles
recettesPossibles
niveauPreuveInterne
redondances
questionOuverte

Ton travail consiste surtout à transformer :

candidate_review en ideal_core, ideal_contextual, experimental, rejected ou deferred_sourcing ;
decision_required en une décision humaine ;
les décisions validées en human_locked.



ARBITRAGE HUMAINS tu complètes manuellement les recettes.

Mais tu ne dois pas tout rédiger. Tu modifies principalement :

statutDansRecette
doseIdealProposee
galenique
timing
decisionStatus
commentaire

Tu valides recette par recette, dans cet ordre :

recuperation_standard
performance_moyenne
performance_courte
performance_longue
preworkout_charge

Utilise :

human_locked pour une décision définitive ;
provisional pour une dose de prototype encore révisable ;
decision_required lorsqu’il manque encore une décision ;
excluded pour un ingrédient explicitement absent.

Tu n’as pas besoin de compléter immédiatement les variantes altitude, chaleur ou préparation générale.













À partir des recettes idéales validées, construis deux projections distinctes sans modifier la définition scientifique idéale.

## Projection A — Prototype accessible

Adapter selon :

* disponibilité en petites quantités ;
* pureté ou standardisation vérifiable ;
* possibilité d’achat sans usine ;
* fabrication manuelle ;
* précision des balances ;
* stabilité et mélange ;
* conditionnement actuellement disponible ;
* budget prototype.

Pour chaque écart, indiquer :

* ingrédient idéal ;
* substitution ou retrait ;
* raison ;
* conséquence fonctionnelle ;
* caractère temporaire ;
* condition de retour à la formule idéale.

## Projection B — Version industrialisable

Identifier :

* qualité matière nécessaire ;
* standardisation ;
* fournisseur ou type de fournisseur ;
* MOQ probable ;
* besoin de prémélange ;
* besoin d’encapsulation ou d’agglomération ;
* contraintes de stabilité ;
* essais requis ;
* impact coût ;
* impact réglementaire.

## Livrables

Créer :

* `recettes-prototype.csv`
* `recettes-industrialisables.csv`
* `ecarts-formulation.csv`

`ecarts-formulation.csv` doit permettre de comparer pour chaque ingrédient :

* recette idéale ;
* prototype ;
* version industrielle ;
* motif de l’écart ;
* impact attendu ;
* statut de résolution.

Ne jamais remplacer silencieusement la recette idéale par la recette prototype.














Lis les modifications validées dans `donnees-metier/formulation/`.

Propage uniquement les lignes marquées `human_locked` vers :

* le catalogue canonique ;
* le moteur ;
* les projections produit ;
* les documents concernés ;
* les tests.

Ne propage pas les valeurs `provisional`, `experimental` ou `decision_required`.

Vérifie avant propagation :

* unités et conversions actif/matière première ;
* masse totale ;
* galénique ;
* timing ;
* sécurité ;
* redondances ;
* cohérence entre recette idéale, prototype et version industrialisable.

Arrête la propagation si une incompatibilité critique ou une donnée indispensable manque.















Lis uniquement les modifications non commitées dans `donnees-metier/formulation/`.

Traite les lignes nouvelles ou modifiées marquées `human_locked`.

Pour ces lignes seulement :

* vérifier la cohérence des unités, titres et conversions actif/matière première ;
* signaler les contradictions de sécurité, de masse, de galénique ou de timing ;
* mettre à jour les projections générées et les sources concernées ;
* adapter les tests ;
* ne pas modifier les autres décisions ;
* ne pas réauditer tout le dépôt.

Avant toute propagation, arrêter le travail si une décision humaine produit une incompatibilité critique ou si une donnée indispensable manque.

Terminer par :

* décisions propagées ;
* fichiers modifiés ;
* contradictions détectées ;
* tests exécutés.



Pour économiser davantage de tokens
Une recette par session. Commence par recuperation_standard, puis performance_moyenne. Ne demande pas l’analyse de toute la gamme à chaque passage.
Utilise le diff Git. Demande à Codex de lire les modifications non commitées au lieu de relire toutes les sources.
Référence les fichiers. Un prompt efficace indique objectif, fichiers concernés, contraintes et condition de fin. C’est précisément la structure recommandée dans la documentation Codex.
Ne charge pas tout gpt-context. Pour une dose de récupération, limite le contexte à :
la matrice de formulation ;
les preuves de récupération ;
la sécurité ;
la recette concernée.
Sépare décision et implémentation. Une première tâche préremplit ou contrôle le tableau. Une deuxième tâche propage uniquement les lignes validées.
Utilise un raisonnement faible ou moyen pour la propagation mécanique. Réserve les niveaux élevés aux arbitrages scientifiques ou aux contradictions complexes ; OpenAI recommande d’adapter l’effort de raisonnement à la difficulté de la tâche.
Génère les autres formats. Les fichiers TypeScript, JSON et Markdown doivent dériver des CSV. Ne les édite pas tous manuellement.
