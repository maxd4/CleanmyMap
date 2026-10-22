# Annuaire des acteurs — propositions réellement restantes

**Statut : `PLAN` — propositions non implémentées**

Ce document ne décrit pas des fonctionnalités disponibles. Une proposition ne doit
passer dans `CURRENT` qu'après implémentation, tests et mise à jour de la fiche
présentation détaillée.

## Propositions conditionnelles

### Rafraîchissement d'événements par une source officielle

Le runtime ne synchronise actuellement aucun atelier ou événement de l'Académie du
Climat. Une évolution ne serait recevable qu'avec une source officielle identifiée,
un propriétaire de l'intégration, une règle de fraîcheur, un traitement explicite des
échecs et une preuve de publication. En l'absence de ces éléments, aucun événement ne
doit être ajouté et aucune promesse de synchronisation ne doit être affichée.

### Enrichissement géographique vérifié

Une future évolution pourrait améliorer la couverture locale si elle dispose de
coordonnées d'organisation vérifiées ou d'une source de géocodage dont la provenance,
la précision et la durée de validité sont conservées. Elle ne doit pas réutiliser un
centroïde de Paris ou de la France comme adresse, ni créer une distance lorsque le
calcul n'est pas interprétable.

### Révision explicite de la fraîcheur des fiches

Une évolution opérationnelle pourrait formaliser la revalidation d'une fiche publiée
et de ses canaux publics. Elle devrait conserver l'identifiant stable, l'historique de
revue, la séparation public/administratif et une décision d'acceptation avant toute
publication. Aucun workflow supplémentaire n'est considéré comme présent tant qu'il
n'est pas décrit par une route, une autorisation, une persistance et des tests.

## Ce qui n'est pas une proposition ouverte

Les garanties déjà couvertes par le contrat actuel ne sont pas des tâches à recréer :

- séparation `editorial_seed` / `published_partner` ;
- filtrage public sur les fiches `accepted` ;
- exclusion des contacts administratifs non consentis ;
- dédoublonnage sur identifiant stable uniquement ;
- distinction portée nationale / couverture locale ;
- graphe limité aux similarités thématiques ;
- erreur publique en cas d'indisponibilité de la source.
