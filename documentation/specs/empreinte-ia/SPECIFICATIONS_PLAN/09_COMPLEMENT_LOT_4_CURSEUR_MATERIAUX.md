# Complément Codex au lot 4 : curseur admissible et scénarios matériaux

**Avec le lot 4, après le lot 0 + 08 et les lots 1 à 3.** Remplace intégralement le précédent `09`. Le lot 4 fournit la prévisualisation **éphémère** ; le nouveau lot 11 ajoutera ensuite le cumul privé, sans contradiction de responsabilité.

```text
COMPLÉMENT LOT 4 : UI DES DEUX OBJECTIFS ET DU CURSEUR

OBJECTIF
Faire du calculateur /learn/empreinte-ia une simulation pédagogique exploitable : objectifs CO₂e/eau issus des tokens, mégots et kg requis, curseur borné aux positions admissibles par le moteur du lot 0.

1. CURSEUR UTILISABLE
- Afficher deux cartes séparées CO₂e et Eau et leurs statuts de scénario. Conserver dans Eau deux lectures non additives : eau consommée nette potentiellement évitée en ACV versus risque de pollution 500 L/mégot.
- L'utilisateur sélectionne la voie hydrique qui sert de critère (analogie de risque, ou consommation nette ACV seulement si facteurs compatibles). Cette sélection est explicite, jamais modifiée automatiquement pendant le déplacement.
- Contrôle « Part d'effort consacrée aux mégots » : calculer les positions admissibles par le moteur 08, désactiver et expliquer les positions INFEASIBLE/OVER_BUDGET ; UNKNOWN n'est pas réussi et ne permet pas d'enregistrer un objectif présenté comme doublement atteint. Gérer plusieurs intervalles éventuels, clavier et lecteurs d'écran ; si aucun positionnement faisable, proposer des changements d'hypothèses sans fabriquer de facteur.
- Afficher en direct mégots entiers, g/kg de déchets, H théorique en personne-heures et effort restant. Option de plafond d'effort personnelle, désactivée par défaut ; les très grandes quantités ne sont pas minimisées ni masquées. Les extrêmes 0 % et 100 % ne sont pas nécessairement autorisés.

2. FILIÈRES ET PÉDAGOGIE
- Case « Mégots envoyés au recyclage », décochée par défaut, avec filière prévue/confirmée distincte. Pour TchaoMegot, afficher le chiffre fournisseur déclaré 3,5 g CO₂/mégot et le qualifier de scénario, non crédit ACV vérifié ni preuve de recyclage.
- Case « Détailler les déchets » : plastique, aluminium, acier/ferreux, verre et autres ; somme 100 %, masses conservées à l'arrondi, hypothèses z_i, carbone ACV seulement si facteurs admissibles, eau nette NA si sources incompatibles. Ne jamais supposer le recyclage effectif d'un déchet collecté.
- Expliquer sans chiffres inventés les bénéfices de réduction de pollution, les limites sur traitements d'eau/incendies, la différence entre l'eau de datacenter et 500 L potentiellement pollués, ainsi que l'impossibilité de déclarer une neutralité physique sur ces seules comparaisons.

3. INTÉGRATION ET PREUVES
- Réutiliser les composants, les modes d'affichage, fr/en, palette Apprendre, pages /methodologie, /learn/comprendre, /sections/recycling, /learn/sentrainer, et les liens Actions ; aucune gamification ni persistance nouvelle dans ce lot.
- E2E navigateur et tests de composant : plages autorisées variables, blocs 0/100, aucun point admissible, modes eau, changement recyclage, efforts et arrondis, valeurs inconnues, accessibilité clavier/écran étroit. Contrôler absence de régression du parcours privé existant et des docs CURRENT.

STOP CONDITION
L'utilisateur peut choisir seulement un scénario théoriquement satisfaisable sur les deux critères choisis, ou reçoit une explication claire de l'impossibilité. Les quantités calculées restent dépendantes de l'usage IA et leurs limites sont visibles.
```