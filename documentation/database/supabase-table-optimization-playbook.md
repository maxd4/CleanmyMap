# Supabase Table Optimization Playbook

Guide central de marche à suivre pour optimiser une table Supabase sans casser le métier, l’UX ou la lisibilité du modèle.

## Quand l’utiliser

Utiliser ce guide avant de toucher une table qui:

- apparaît souvent dans les audits de quotas;
- reçoit des lectures répétées ou non bornées;
- sert à plusieurs features à la fois;
- est branchée à un nouveau flux produit;
- remonte des warnings que l’on pourrait être tenté de “faire baisser” artificiellement.

## Ce qu’on perd si on optimise mal

Une mauvaise optimisation fait perdre surtout:

- du temps de débogage, parce qu’on ne sait plus où la vérité métier vit;
- de la flexibilité produit, parce que la table est simplifiée avant d’avoir été comprise;
- de la lisibilité technique, parce qu’on masque une vraie charge derrière un faux gain;
- de la robustesse, si une règle métier disparaît juste pour faire baisser un warning;
- de la traçabilité, si on corrige un symptôme au lieu du chemin de lecture ou d’écriture.

Le but n’est pas de faire baisser les warnings à tout prix. Le but est de réduire le coût réel sans perdre le sens métier.

## Règles à réutiliser pendant le développement

### 1. Quand on branche autre chose à la table

Avant de raccorder une nouvelle feature:

- identifier si elle lit, écrit, compte, recherche, exporte ou agrège la table;
- vérifier si elle ajoute une fréquence d’accès;
- vérifier si elle change les colonnes nécessaires;
- vérifier si elle introduit une recherche partielle ou un tri qui aura besoin d’index.

Si la feature se branche sur la table, elle hérite aussi de ses contraintes de quota.

### 2. Quand on gère les requêtes de la table

Chaque requête doit être:

- bornée;
- projetée sur les colonnes utiles;
- indexable si elle sert au runtime;
- testée sur le chemin réel, pas seulement sur un mock théorique.

Bon réflexe:

- `eq`, `in`, `range`, `limit`, `head: true`;
- index btree sur les colonnes exactes;
- trigram ou index d’expression pour les recherches partielles;
- RPC stable si la logique est partagée ou coûteuse.

Mauvais réflexe:

- charger toute la table puis filtrer en mémoire;
- ajouter un `ilike` sans index adapté;
- multiplier les requêtes au montage;
- compenser un problème de requête par une simplification de table.

### 3. Quand une table remonte des warnings

Ne pas supprimer artificiellement les warnings en:

- retirant des colonnes métier utiles;
- fusionnant des concepts distincts;
- dénormalisant sans besoin réel;
- dégradant une règle métier pour “faire passer” un audit;
- cachant le problème derrière une pagination cosmétique.

La vraie question est:

1. quelle requête coûte trop cher;
2. quel index manque;
3. quelle partie de la logique peut devenir un RPC;
4. quelle colonne ne sert pas et peut être retirée;
5. quelle fréquence d’accès est vraiment nécessaire.

## Marche à suivre

### Étape 1. Qualifier la table

Déterminer si la table est:

- centrale et très utilisée;
- de support;
- administrative;
- dérivée;
- archive;
- de recherche.

Une table centrale peut rester visible dans les audits si son usage est légitime. On ne cherche pas à la rendre “petite” à tout prix.

### Étape 2. Qualifier les chemins

Lister:

- les lectures;
- les écritures;
- les compteurs;
- les exports;
- les recherches;
- les agrégations;
- les appels répétés au montage;
- les accès admin.

### Étape 3. Réduire le coût

Appliquer cet ordre:

1. projection minimale;
2. borne explicite;
3. filtre déplacé dans la base;
4. index adapté;
5. RPC dédiée si la logique revient souvent;
6. seulement ensuite, revoir le modèle de données si le besoin réel le justifie.

### Étape 4. Garder le sens métier

Ne pas simplifier la table si cela:

- supprime une information utile;
- rend les règles plus floues;
- force une logique cachée ailleurs;
- crée une dette plus grosse que le warning initial.

## Règle de décision

Accepter une table qui reste “high” ou “critical” si:

- elle est centrale;
- les requêtes sont bornées;
- la colonne filtrée est indexée;
- le comportement visible reste correct;
- la table n’a pas été artificiellement appauvrie.

Corriger en priorité si:

- un scan complet est filtré côté application;
- une recherche partielle n’a pas d’index adapté;
- une table est lue à chaque montage sans limite;
- une simplification du modèle a été faite juste pour faire baisser un warning.

## Checklist de validation

- [ ] la table est qualifiée: centrale, support, admin, dérivée ou archive;
- [ ] les chemins d’accès sont listés;
- [ ] chaque requête runtime est bornée;
- [ ] les colonnes retournées sont minimales;
- [ ] les filtres sont faits dans la base;
- [ ] les index nécessaires existent;
- [ ] une RPC a été ajoutée si la logique est réutilisée;
- [ ] aucun changement de modèle n’a été fait uniquement pour faire baisser les warnings;
- [ ] un test protège le chemin optimisé;
- [ ] la documentation est reliée au guide Supabase principal.

## Références à réutiliser

- `documentation/development/supabase-quota-guide.md`
- `documentation/development/supabase-query-optimization-playbook.md`
- `documentation/database/supabase-quota-audit.md`
- `documentation/development/supabase-query-optimization-playbook.md` section "Special case: dynamic pollution score for actions" when a table feeds a relative 100% score based on the current database maximum
