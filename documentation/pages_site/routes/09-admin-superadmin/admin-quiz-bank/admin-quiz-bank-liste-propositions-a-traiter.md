# Banque de quiz — Liste des propositions à traiter

## Proposition 1 — Protéger le contrat admin-only par test

Priorité : haute.

Cas :

```txt
anonyme → notFound
rôle non admin → notFound
admin → page rendue
```

Ne pas supposer que `max` est autorisé si le code ne le dit pas.

## Proposition 2 — Vérifier la couverture des sources

Priorité : haute.

Pour chaque question nécessitant une preuve :

- source présente ;
- URL valide si applicable ;
- statut de vérification explicite ;
- aucune source inventée.

## Proposition 3 — Mesurer avant pagination

Priorité : basse.

Ne paginer ou virtualiser que si :

- nombre de questions ;
- taille du snapshot ;
- temps serveur ;
- temps de rendu

justifient le changement.

## Règle

Une proposition terminée quitte ce fichier.

Les décisions durables vont dans la fiche canonique ou la documentation learning adaptée.
