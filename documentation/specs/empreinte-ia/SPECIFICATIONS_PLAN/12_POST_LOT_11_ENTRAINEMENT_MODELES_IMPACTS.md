# Lot Codex après 11 : empreinte d'entraînement et impacts hors compensation

**Type : lot XL (3 jalons).** Exécuter **après le lot 11 et avant le complément pédagogique 10**. Sources candidates : `01_DECISIONS_SCIENTIFIQUES_ET_CALCULS.md` §14 et `13_SOURCES_ENTRAINEMENT_ET_EXEMPLES.md`. Relire les contrats CURRENT du checkout.

```text
LOT 12 : Comprendre les modèles, leur entraînement et leurs impacts non compensables

OBJECTIF
Dans /learn/empreinte-ia, ajouter un onglet « Comprendre les modèles » avec fiches d'entraînement sourcées, comparaisons pédagogiques et simulateur d'allocation, puis un volet « Impacts au-delà des chiffres ». Aucun entraînement ajouté au bilan, au défi, aux objectifs de collecte ou aux XP.

JALON 1 : REGISTRE DE PREUVES ET MOTEUR PUR
- Étendre le catalogue canonique apps/web/src/lib/environmental-impact-estimator/model-catalog.ts par un registre facultatif de preuves indexé par modelId/version/phase, sans inventer le coût des modèles propriétaires absents. Garder sources, dates, périmètres IT/GPU/site, statut mesuré/estimé/NA, CO₂ location/market séparés, eau et filiation (pré-entraînement, post-entraînement, distillation, quantification). Réutiliser scientific-registry et ses invariants.
- Calculer R_E=E_train/E_user uniquement en kWh, pour le modèle/version concerné, avec frontières identiques ou conversion documentée, et E_user>0 ; sans compatibilité ou usage personnel inconnu, afficher NA. Le libellé précise qu'il s'agit d'une comparaison d'énergies, non d'un rapport de tokens ou d'une facture carbone. Autoriser un scénario purement fictif explicite pour montrer l'algorithme ; ne pas afficher un ratio trompeur pour Llama/BLOOM à partir de frontières GPU/TDP et IT incompatibles.
- Ajouter les simulations pures E_train/(U*D), E_train/(U*E_inference_personne_jour) et E_train/E_inference_personne_jour, uniquement avec hypothèses visibles. Prévoir une comparaison optionnelle de volumes de tokens de pré-entraînement, strictement étiquetée « pas une empreinte ». Modèle ou version manquants = NA, sans coût réparti artificiellement à l'utilisateur.

JALON 2 : UI ET ÉTUDES DE CAS
- Onglet /learn/empreinte-ia#modeles : modèles du catalogue, filtre, cartes d'énergie, CO₂e, eau (ou « non publié »), source et niveau de preuve. Dans la synthèse d'usage personnel, montrer lorsque valide « L'entraînement de ce modèle représente environ X fois l'énergie estimée de votre usage de cette version », détails de la formule et lien vers l'onglet ; ne pas afficher X lorsque non calculable. Aucun ratio sur les seuls tokens n'est appelé pollution.
- Ajouter curseurs facultatifs U utilisateurs et D jours, charge d'inférence par personne et résultat d'égalité énergétique, en précisant que ce sont des scénarios de mutualisation, pas des chiffres réels de fréquentation. Distinguer durée pour une personne et pour une flotte. Conserver l'énergie d'entraînement totale inchangée quand U augmente.
- Trois exemples pédagogiques source-backed à partir de 13 : BLOOM et différences de périmètre, Llama 3/3.1 performance vs émissions, Llama 3.2 post-traitement ; Gemini mesure d'inférence comme référence distincte. Comparer à tâche et benchmark identiques, ne pas conclure à une rentabilité énergétique sans E_avant/E_après et coût d'amélioration. Chat/document/agent sont des profils d'opérations, jamais des multiplicateurs fixes ni une inférence d'intention depuis la seule application.

JALON 3 : IMPACTS NON COMPENSABLES ET INTÉGRATION
- Volet /learn/empreinte-ia#impacts-limites : travail d'annotation/modération, bruit et effets locaux, tensions territoriales eau/électricité, extraction et fabrication, e-déchets, différence location-based/market-based et limites des crédits carbone. Textes sourcés et équilibrés, risques localisés présentés comme tels ; aucun score social, dB ou litres inventés par token, aucune conversion en cleanwalk.
- Adapter les consommateurs UI et navigation existants, FR/EN, modes exhaustif/minimaliste/sobre, mobile responsive, accessibilité, états NA. Aucun nouvel endpoint personnel ni nouvelle table utilisateur. L'onglet pédagogique ne doit pas exposer les relevés privés aux autres utilisateurs. Le contenu détaillé sera réutilisé par le complément 10, sans créer un deuxième quiz.
- Tests purs : ratio kWh et incompatibilités de frontière, phase/version, zéros/NA, changement U sans changer E_train, jours d'égalité, benchmarks comparables, coût incrémental inconnu, absence d'ajout dans empreinte/stockage/défi/badges. Tests navigateur de l'onglet, des liens, des modes et des locales ; typecheck, lint, couverture pertinente et documentation CURRENT scientifique/page.

STOP CONDITION
L'utilisateur connaît les coûts publiés et incertitudes des modèles, peut comparer l'entraînement à son usage en ENERGIE quand les périmètres le permettent, explorer des scénarios d'allocation et comprendre les impacts non compensables, sans aucune modification de son empreinte calculée ou de sa gamification.
```