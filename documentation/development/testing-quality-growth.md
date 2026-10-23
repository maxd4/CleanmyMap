# Croissance du dépôt

> Module associé à [testing-quality.md](./testing-quality.md). Statut : mesures descriptives.

## Suivi historique de croissance du dépôt

Le suivi de croissance est une mesure descriptive et reproductible ; il ne
crée ni seuil bloquant, ni baseline, ni commit automatique. La commande
canonique est :

```bash
npm run metrics:repository-growth -- --ref=HEAD --compare=<sha> --branch=main --months=12
```

Elle lit les arbres Git des refs par SHA, sans checkout, clone, worktree,
service externe ou mutation Git, et écrit uniquement les sorties régénérables
dans `artifacts/repository-growth/` : `repository-growth.json` et
`repository-growth.md`. `--compare` est optionnel et utilise sinon le parent
de la ref courante ; `--as-of=YYYY-MM-DD` permet de fixer explicitement
l'ancre historique. Une série mensuelle conserve la SHA exacte du dernier
commit first-parent de `main` atteint à la fin UTC de chaque mois complet. Un
mois sans commit accessible ou une histoire trop courte reste explicitement
`MISSING_HISTORY` ou `INSUFFICIENT_HISTORY` ; aucune estimation n'est ajoutée.

Les catégories sont exclusives et leur somme couvre toutes les entrées de
l'arbre Git : web runtime, mobile runtime, tests web, tests mobile, E2E/tests
de scripts, documentation, scripts/CI, SQL/migrations, données/configuration,
médias/binaires, vendored/generated/lockfiles, autre texte et sous-modules.
Les bytes sont les bytes bruts des blobs Git. Les lignes physiques comptent
chaque CRLF, LF ou CR isolé comme un séparateur, avec une dernière ligne pour
un blob non terminé ; un fichier vide compte zéro. Ce compteur n'est pas un
LOC exécutable.

Le rapport expose aussi le ratio de volume lignes tests/runtime. Ce ratio ne
mesure pas la couverture. Le nombre de fichiers au-dessus de REVIEW, HARD et
dans la zone préventive réutilise la politique `quality:top-heavy` existante.
Les historiques complexity, cycles, duplication et dead-code restent
`NOT_MEASURED` lorsqu'une preuve exacte par SHA n'est pas disponible ; une
baseline ou un résultat courant ne devient jamais une amélioration historique.

La commande est volontairement manuelle pour éviter un coût récurrent et ne
publie aucun commit de statistiques. Pour une comparaison entre deux refs,
vérifier les SHAs et conserver le JSON produit avec l'artefact de validation
du lot concerné si une preuve éphémère est nécessaire.
