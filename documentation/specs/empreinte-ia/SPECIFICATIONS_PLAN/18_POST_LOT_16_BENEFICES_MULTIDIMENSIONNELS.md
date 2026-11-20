# LOT 18 : empreinte IA, bénéfices environnementaux et engagement humain et territorial

**Type : lot XL. Statut PLAN.** À exécuter après le lot 16 ; documents de référence : `01` §16, `19`, `20` ; les propriétaires des actions, parts personnelles, entreprises et rapports ont été établis dans les lots 11, 14, 15 et 16. Exécution web uniquement sauf consommateur mobile effectif identifié.

## Objectif

Étendre le parcours « token -> collecte symbolique » en une restitution scientifique **à trois niveaux indépendants**, traçable jusque dans les défis, attestations et rapports professionnels, sans compensation carbone fictive et sans nouveaux crédits XP. Décrire la destination connue ou inconnue des déchets afin de ne plus confondre ramassage, recyclage, incinération et bénéfice carbone.

## Jalon 1 : contrats et calculs

- Réutiliser les owners et projections existantes : `apps/web/src/lib/environmental-impact-estimator/`, `apps/web/src/lib/actions/participation/individual-impact.ts` et consommations du lot 11 ; ne pas créer un nouveau moteur d'empreinte, journal XP, référentiel de déchets ou seconde mesure individuelle.
- Exposer trois vues typées : `empreinteIA` (énergie, CO₂e, eau et statuts), `beneficesTerrain` (quantités attribuées, filière/réincorporation, propreté, risque et environnement), `engagementHumainTerritorial` (actions, temps réellement relevé, participants, ateliers, suivi), sans somme numérique globale. Réutiliser les types `ScientificProofStatus` si appropriés ; chaque métrique a `scope`, unité, provenance, période, version et raison `NA`.
- Associer aux portions de collecte un statut de destination `recyclage_confirmé`, `recyclage_envisagé`, `incinération_avec_valorisation`, `incinération_sans_valorisation`, `stockage`, `traitement_spécialisé`, `inconnue` lorsque **le modèle de données actuel permet une attestation fiable**. Ne pas considérer une coche UI comme attestation de recyclage, une inscription future comme présence ou un bac de tri comme incorporation effective. Prévoir saisie minimale/audit par acteur habilité, règles d'unicité et version de correction en réutilisant le domaine Actions ; si le schéma actuel ne peut pas porter ces données sans migration, n'ajouter que le strict champ/owner justifié. `r_i*z_i` reste une hypothèse du simulateur si le rendement réel n'est pas documenté.
- Ne pas appliquer la formule ACV BNR `2,702` plastique, `6,407` aluminium, **`1,948` verre** aux fractions incinérées. Pour ces fractions, `beneficeRecyclage=0`, mais `emissionsIncinération=NA` et `beneficeClimatiqueNet=NA` sans ACV distincte ; le moteur de calcul IA ne change pas. Les scénarios de compensation symbolique restent séparés des observations terrain.

## Jalon 2 : interface et contextualisation

- Sur `/learn/empreinte-ia`, présenter trois blocs navigables : **Empreinte IA**, **Bénéfices environnementaux du terrain**, **Bénéfices humains et territoriaux**. Distinguer visuellement valeurs attribuées, calculs conditionnels, analogies et facteurs indisponibles. Le volet pédagogique modèle/entraînement du lot 12 reste inchangé et accessible.
- Fournir un détail par matériau de `masse collectée -> orientée -> réincorporée`; présenter l'incinération avec/sans valorisation et la gestion inconnue comme destinations légitimes mais **sans coefficient de recyclage ni réduction automatique du CO₂**. Conserver le retrait de pollution/propreté comme bénéfice séparé, sans annoncer d'eau réellement sauvée via `500 L/mégot`.
- Ajouter des indicateurs sans score artificiel : comptage de mégots et autres petits déchets non dangereux, sachets de nicotine/snus **catégorie distincte**, risques microplastiques, fils/objets à risque pour animaux (observation, pas nombre d'animaux sauvés), propreté avant/après lorsque protocole mesuré, minutes d'activité déclarées, participants uniques, ateliers et sensibilisations prouvées. Pour les déchets dangereux : consignes de sécurité et signalement, pas de badge au ramassage. Ne pas convertir minutes en bénéfice santé, ni participants en lien social « mesuré » sans enquête.
- Adapter les attestations du lot 14 et les agrégats/rapports des lots 15-16 pour afficher ces **rubriques explicatives** quand les données existent ; ne pas publier des informations de santé ou d'emploi individuelles, respecter les partages et les affectations uniques. Les bénéficiaires d'entreprise ne reçoivent aucun accès aux imports IA privés.

## Jalon 3 : validations et preuve

- Tests physiques et statuts `0/NA`, provenance/version ; cohérence entre matières et poids, fractions nulles/totales, destination inconnue, incinération sans/avec récupération d'énergie, filière prévue/confirmée, correction d'Action, absence d'attribution à deux personnes ou deux structures, absence d'ajout XP et absence de neutralité carbone. Test de référence `19` sur facteurs 10, p20/80, y30/70/100, décomposition hydrique.
- Tests d'intégration de la mutation réellement exécutée, AuthN/AuthZ/RLS si schéma touché, lecture multi-utilisateurs, contrat de partage, absence de fuite de métadonnées IA, interface FR/EN, responsive, accessibilité, quiz et PDF existants. Mesure de couverture utile, documentation CURRENT effectivement affectée. Ne pas annoncer une preuve SQL si elle n'a pas été exécutée.

## STOP CONDITION

Un utilisateur peut comprendre séparément son empreinte IA, l'effet documenté ou incertain du traitement de sa collecte et les résultats humains/territoriaux observés ; rapports et attestations respectent les quantités uniques et les droits, et aucun déchet incinéré ne reçoit de faux crédit de recyclage ou de santé.