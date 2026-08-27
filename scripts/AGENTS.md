# Gouvernance locale — `scripts`

Héritage : gouvernance racine → ce périmètre scripts. Ce fichier concerne les
contrôles, audits, helpers CI, nettoyage, données, design, développement,
médias et rapports présents sous `scripts/`.

## Intention des outils

- ne jamais affaiblir un check uniquement pour obtenir un résultat vert ;
- lorsqu'un garde-fou est modifié, conserver son intention et tester au moins
  un cas positif et un cas négatif lorsque cela est pertinent ;
- distinguer les scripts d'audit ou read-only des scripts pouvant muter une
  donnée, un artefact ou un environnement ;
- privilégier une validation ciblée avant une suite lourde.

Le fichier `scripts/heavy-files-baseline.json` est un inventaire temporaire de
dette historique, pas une autorisation permanente de dépasser les seuils. Ne
pas y ajouter une entrée pour contourner un garde-fou. Lorsqu'un fichier sort
de la dette mesurée, retirer son entrée ; lorsqu'il est significativement
modifié, réévaluer sa cohésion et le ratchet en mode `--enforce`.

## Nettoyage et mutations

- un cleanup destructif exige une provenance démontrée, une cible explicite et
  un périmètre vérifié ;
- conserver les artefacts utiles et les chantiers parallèles ; ne jamais
  nettoyer ou réinitialiser une zone étrangère ;
- ne pas transformer un diagnostic, un rapport ou un dry-run en preuve de
  mutation appliquée ;
- respecter les options et garde-fous propres à chaque script avant toute
  opération distante.

Les artefacts générés doivent rester dans les emplacements prévus par le
script ou dans les dossiers techniques existants, jamais à la racine par
commodité.

Validation des scripts lorsque les tests associés existent :

```bash
npm run test:scripts
```
