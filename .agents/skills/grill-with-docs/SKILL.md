---
name: grill-with-docs
description: "Challenger une décision ou un plan CleanMyMap à partir de son code, de ses ADR et de sa documentation canonique, avant de fixer ses invariants."
category: workflow
risk: medium
source: local
tags: "[grill, with, docs]"
---

# Revue contradictoire d'une décision avec la documentation

## Déclenchement

Activer lorsqu'une architecture, règle métier, protocole ou plan paraît ambigu, incomplet ou contradictoire, et que l'utilisateur demande de challenger la décision. Ne pas imposer une interview à chaque correction locale.

## Méthode

1. Reformuler le **résultat attendu** et la `STOP CONDITION`, avec ce qui est déjà décidé.
2. Lire `main`, l'owner du domaine, les contrats `CURRENT`, l'ADR pertinent et les tests. Les fichiers `CONTEXT.md`, `docs/adr/` ou templates fournis avec ce skill ne deviennent jamais canoniques par défaut.
3. Construire un tableau bref : fait démontré / hypothèse / alternative / risque / coût / décision.
4. Rechercher des contre-exemples concrets : autres écritures, droits, états, données historiques, erreurs, reprise, service externe, consommateurs et cas limites proportionnés au changement.
5. Poser uniquement la question qui bloque une décision non inférable ; sinon décider et marquer clairement les hypothèses restantes.
6. Suggérer un ADR seulement pour une décision architecturale durable réellement nouvelle ; sinon mettre à jour la source canonique spécialisée existante.

## Livrable

Une décision exécutable, ses invariants, conséquences transversales, preuves et périmètre. Pas de rédaction automatique de fichiers `CONTEXT.md` ni de modification distante sans demande explicite.
