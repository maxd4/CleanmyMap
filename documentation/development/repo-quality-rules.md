# Règles de qualité du dépôt

Ce document complète les consignes de dépôt avec les règles opérationnelles à appliquer
pour chaque lot de code, test ou documentation.

## 1. Prouver avant de modifier

- Vérifier la branche, le diff et la source GitHub avant de cibler un fichier.
- Reproduire le problème avec un test, un audit ou une observation précise.
- Ne pas traiter une ancienne note, un ancien plan ou une alerte historique comme
  une preuve de l'état courant.
- Séparer dans le compte rendu : implémenté, configuré, testé et observé.

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

- Toute correction de logique ajoute ou renforce un test de cause racine.
- Pour une route ou une page protégée, couvrir au minimum l'accès anonyme, le
  profil incomplet, l'erreur de source de données et le rôle autorisé.
- Les tests d'exports vérifient le contenu, le type de fichier et les permissions,
  pas seulement le statut HTTP.
- La suite complète reste la référence. Les suites ciblées servent à raccourcir
  la boucle locale, jamais à remplacer la couverture globale.
- Ne pas paralléliser plusieurs processus Vitest qui recouvrent les mêmes tests
  sans preuve de stabilité ; Vitest conserve sa propre parallélisation interne.

## 4. Documentation et routes

- Une route canonique possède une entrée dans `documentation/pages_site/INDEX.md`
  et une fiche existante.
- Un alias ou une redirection doit indiquer explicitement sa cible. Une route
  supprimée ne doit plus être présentée comme canonique dans une matrice.
- Ne pas référencer un fichier absent. Les plans actifs sont ceux qui existent
  dans `documentation/plans-perso/` et leur statut doit rester lisible.
- Une règle technique transversale vit dans un document canonique, puis est
  liée depuis les index ; elle n'est pas copiée dans plusieurs backlogs.

## 5. Modularisation

- Un lot traite une cible principale et conserve ses props, exports, routes et
  contrats publics ; une modularisation directement liée, sûre et utile peut
  rester dans le lot fonctionnel qui traverse la zone.
- Extraire d'abord les constantes et helpers purs, puis la logique d'état, puis
  le rendu.
- Ajouter ou conserver les tests avant de supprimer une implémentation legacy.
- Ne pas ajouter un fichier au baseline des monolithes sans justification et
  mesure actuelle.
- La liste de modularisation doit être régénérée depuis le dépôt courant avant
  de choisir le lot suivant.

## 6. Validation et livraison

- Lancer les contrôles ciblés après chaque correction, puis les contrôles adaptés
  au risque avant la livraison.
- Une commande échouée reste échouée dans le rapport, même si une autre commande
  passe avec un environnement temporaire différent.
- Préserver les modifications utilisateur hors périmètre avec un staging ciblé.
- Suivre la politique Git canonique du dépôt pour la branche, le commit et le
  push ; ne pas la dupliquer ici.
