# Rapport Impact

Ce sous-dossier regroupe le rapport d'impact vivant et ses pièces techniques associées.

La source de vérité active est [`impact_IA.md`](./impact_IA.md).

---

## Contenu

- le rapport principal `impact_IA.md`;
- la méthode du graphique `graphique_impact_CO2e.md`;
- les sources bibliographiques `references.bib` et `references_annexes.bib`;
- les règles de rédaction `regle-chat-rapport.md`;
- les plans de transformation et notes de travail liées au rapport.

---

## Règle d'usage

- Ne pas recréer une autre copie vivante du rapport ailleurs dans `documentation/plans/`.
- Si un nouveau contenu concerne le bilan d'impact IA, il doit être ajouté dans `impact_IA.md` ou dans un fichier explicitement référencé depuis ce dossier.
- Les documents obsolètes ou remplacés peuvent être archivés ailleurs, mais ce sous-dossier reste le point d'entrée actif du rapport d'impact.

## Rendu PDF

- La source canonique du contenu reste `impact_IA.md`, mais Quarto peut refuser de le rendre directement si le document contient des shortcodes ou d'autres éléments exécutables.
- Avant tout rendu, vérifier que le front matter YAML est bien fermé par un `---` avant le premier bloc de contenu.
- Si Quarto signale qu'un document Markdown doit utiliser l'extension `.qmd`, créer temporairement une copie locale `impact_IA.qmd` dans ce même dossier, lancer le rendu dessus, puis supprimer la copie et les artefacts intermédiaires après succès.
- Commande validée pour le rendu PDF depuis ce dossier: `quarto render impact_IA.qmd --to pdf`
- Le PDF final est généré dans `documentation/plans/_output/rapport_impact/impact_IA.pdf`.
- En cas d'échec, vérifier en priorité `impact_IA.log`, `impact_IA.tex` et le positionnement des séparateurs `---` du front matter, puis nettoyer les fichiers temporaires avant de recommencer.
