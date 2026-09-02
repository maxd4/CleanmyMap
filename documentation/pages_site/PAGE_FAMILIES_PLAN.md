# Plan — familles de pages

## Statut

```txt
Actif — décisions produit et couverture résiduelle à fermer
```

Ce fichier contient uniquement le **travail restant** autour de `page-families`.

Le contrat courant, les sources runtime, la taxonomie, les exceptions et la
méthode de maintenance sont définis dans
[`PAGE_FAMILIES.md`](./PAGE_FAMILIES.md).

## Objectif de clôture

Fermer les décisions qui empêchent encore `page-families` d'être uniquement un
contrat de maintenance, sans créer de deuxième logique de résolution entre le
runtime et la documentation.

## Décisions ouvertes

### P0 — familles produit non arbitrées

Décider explicitement du statut de :

```txt
/sections/recycling
/sections/compost
/sections/climate
```

Pour chacune :

- choisir une famille métier existante, ou
- décider qu'elle reste hors famille, ou
- créer une nouvelle famille uniquement si une responsabilité produit distincte
  le justifie réellement.

Après décision :

- modifier le resolver si nécessaire ;
- couvrir le choix par test ;
- mettre à jour `INDEX.md` et la fiche route concernée ;
- ne pas mapper une route uniquement pour éliminer un fallback.

### P1 — couverture réelle des composants métier

Auditer les surfaces encore hors primitives `page-families` uniquement lorsque
le code ou un contrôle révèle une incohérence visible.

Points à vérifier au besoin :

- cartes métier qui n'utilisent pas `FamilyRubriqueCard` ;
- héros locaux qui dupliquent une décision déjà centralisée ;
- fonds ou tons de bloc codés en dur en contradiction avec le resolver.

Ne pas lancer une migration exhaustive uniquement pour uniformiser le code.
Une extraction ou migration doit supprimer une duplication ou corriger une
incohérence démontrée.

### P2 — nouveaux tokens éventuels

N'ajouter des tokens `panel`, `kpi`, `stat` ou équivalents que si plusieurs
surfaces partagent réellement le même contrat et que cette centralisation
réduit une duplication mesurable.

Ne pas étendre `page-families` à tous les composants visuels par principe.

## Critères de clôture

Le plan peut être fermé lorsque :

```txt
[ ] recycling / compost / climate ont reçu une décision explicite
[ ] aucune contradiction connue route ↔ famille ↔ fiche n'est ouverte
[ ] chaque exception structurante reste couverte par test
[ ] le contrôle de dérive est vert sur le périmètre courant
[ ] aucun travail restant ne nécessite un backlog page-families dédié
```

Une fois ces critères remplis :

- supprimer ce plan ;
- conserver uniquement [`PAGE_FAMILIES.md`](./PAGE_FAMILIES.md) comme contrat
  courant ;
- ne pas créer de nouveau document de progression sauf nouveau chantier
  explicitement décidé.
