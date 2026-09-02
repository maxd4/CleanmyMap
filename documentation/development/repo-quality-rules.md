# Règles de qualité du dépôt

Ce document complète les consignes du dépôt avec les règles opérationnelles
spécialisées de qualité. Il ne remplace pas les contrats de sécurité, de test,
d'architecture ou de domaine.

## 1. Prouver avant de modifier

- Vérifier l'état courant de la source ciblée avant de décider.
- Reproduire ou caractériser le problème avec un test, un audit ou une
  observation précise lorsque c'est pertinent.
- Ne pas traiter une ancienne note, un ancien plan ou une alerte historique
  comme une preuve de l'état courant.
- Séparer dans le compte rendu : implémenté, configuré, testé et observé.
- Préférer la cause racine à un contournement qui rend seulement un contrôle
  vert.

## 2. Contrats de données

- Toute donnée écrite dans `actions` passe par le contrat de normalisation et la
  source unifiée appropriée.
- Les valeurs `measured`, `derived`, `estimated` et `missing` restent distinctes
  dans les types, les exports et les interfaces.
- Une géolocalisation est explicitement `valid`, `missing`, `partial` ou
  `invalid`. Un compteur nommé `missing` ne doit pas inclure les trois autres
  états.
- Une anomalie bloquante doit empêcher l'écriture ou la diffusion concernée et
  être couverte par un test.

## 3. Tests de non-régression

- Toute correction de logique ajoute ou renforce un test de cause racine
  lorsque l'infrastructure le permet.
- Pour une route ou une page protégée, couvrir les états d'accès réellement
  pertinents au contrat modifié.
- Les tests d'exports vérifient le contenu, le type de fichier et les
  permissions, pas seulement le statut HTTP.
- Commencer par les tests ciblés. Élargir aux tests de contrat puis aux suites
  plus larges selon le risque du lot.
- Ne pas paralléliser plusieurs processus Vitest qui recouvrent les mêmes tests
  sans preuve de stabilité ; Vitest conserve sa propre parallélisation interne.
- Une suite globale n'est pas une obligation mécanique pour chaque micro-lot :
  elle reste une preuve plus large lorsqu'une publication, une frontière
  partagée ou le risque du changement la justifie.

## 4. Documentation et routes

- Une route canonique possède une entrée dans `documentation/pages_site/INDEX.md`
  et une fiche existante.
- Un alias ou une redirection doit indiquer explicitement sa cible. Une route
  supprimée ne doit plus être présentée comme canonique dans une matrice.
- Ne pas référencer un fichier absent.
- Les plans actifs restent distincts des documents publics et leur statut doit
  être lisible.
- Une règle technique transversale vit dans un document canonique, puis est
  liée depuis les index ; elle n'est pas copiée dans plusieurs backlogs.

## 5. Modularisation

La source spécialisée est
`documentation/development/conventions-modularisation.md`.

- Traiter une cible principale à la fois.
- Conserver props, exports, routes et contrats publics sauf décision distincte.
- Utiliser la taille comme signal de revue, jamais comme objectif d'extraction
  isolé.
- Ajouter ou conserver les tests avant de supprimer une implémentation legacy.
- Ne pas ajouter un fichier au baseline des monolithes sans justification et
  mesure actuelle.
- Régénérer ou revalider le radar avant de choisir le lot suivant.

## 6. Performance, dépendances et sobriété

- Une nouvelle dépendance ou un nouveau service doit répondre à un besoin réel
  que les capacités existantes ne couvrent pas raisonnablement.
- Éviter les requêtes, calculs, stockages et assets redondants lorsqu'une
  solution plus simple fournit le même contrat.
- Isoler un service tiers derrière une frontière claire lorsque cela réduit
  réellement le couplage ou facilite sa substitution.
- Ne pas imposer une abstraction ou un fournisseur uniquement pour une
  promesse de sobriété non mesurée.
- Toute affirmation chiffrée d'impact, d'économie ou de performance doit être
  soutenue par une mesure, une source ou un protocole explicite.
- Les contraintes spécifiques Vercel, Supabase, assets, cache et quotas restent
  dans leur documentation opérationnelle spécialisée.

## 7. Validation et livraison

- Lancer les contrôles ciblés après une correction, puis les contrôles adaptés
  au risque avant la livraison.
- Une commande échouée reste échouée dans le rapport, même si une autre
  commande passe dans un environnement différent.
- Un échec provenant d'un chantier parallèle doit être distingué d'une
  régression du candidat ; il ne doit ni être masqué ni provoquer une
  modification hors périmètre.
- Préserver les modifications utilisateur hors périmètre avec un staging
  ciblé.
- Suivre la politique Git canonique du dépôt pour le commit et le push ; ne pas
  la recopier ici.
