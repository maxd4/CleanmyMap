# Spécification produit - Rappels cognitifs par rubrique

Version cible pour implémentation incrémentale.  
Objectif: renforcer la mémorisation, l'engagement utile et la rétention long terme sans complexifier le site.

## Contraintes
- Ne pas modifier la logique métier existante.
- Ne pas ajouter de dépendance.
- Ne pas créer de système de notification intrusif.
- Garder l'identité visuelle semi-dark émeraude/cyan/violet.
- Préserver la simplicité de navigation et la lisibilité.
- Les labels ci-dessous sont les libellés UX de référence.

## Labels UX canoniques
- `Quiz`
- `Apprendre`
- `Impact`
- `Actions`
- `Rapports`
- `Réseau`
- `Nouvelles`
- `Échouées`
- `À revoir`
- `Maîtrisées`
- `Prochaine révision`
- `Mini-défi`
- `Feedback immédiat`
- `Questions mélangées`
- `Rappel à revoir`
- `Reprendre demain`
- `Progression de maîtrise`
- `Curiosité`

## Séquence de prompts à exécuter

### Prompt 1 - Cadrage global
Tu dois intégrer les principes de pratique de récupération, répétition espacée, interleaving, amorçage par la curiosité et consolidation nocturne dans tout le produit, sans toucher à la logique métier. Produis une structure de rubriques et de micro-rappels cognitifs simple, cohérente et réutilisable. Définis les statuts communs `Nouvelles`, `Échouées`, `À revoir`, `Maîtrisées`, ainsi que le champ visible `Prochaine révision`.

Critères d'acceptation:
- aucune nouvelle dépendance
- aucun changement de schéma ou d'API
- labels UX homogènes partout
- pas de surcharge visuelle

### Prompt 2 - Quiz
Refonds la rubrique `Quiz` comme cœur du dispositif cognitif. Elle doit exposer clairement les états d'apprentissage et utiliser la répétition espacée comme hiérarchie de priorité. Les questions doivent être mélangées par thème, avec retour immédiat après réponse.

Libellés UX obligatoires:
- `Quiz`
- `Nouvelles`
- `Échouées`
- `À revoir`
- `Maîtrisées`
- `Prochaine révision`
- `Feedback immédiat`
- `Mini-défi`
- `Questions mélangées`

Comportement attendu:
- `Nouvelles` = questions jamais vues
- `Échouées` = réponses fausses ou non maîtrisées
- `À revoir` = questions dues selon `next_review_at`
- `Maîtrisées` = questions stables, espacées davantage
- `Prochaine révision` = date lisible par question ou par groupe
- `Mini-défi` = question plus difficile ou thème voisin après une série de bonnes réponses

Règles UX:
- afficher le statut avant la réponse
- afficher le feedback juste après la réponse
- conserver un ordre de session lisible
- éviter les sessions monothèmes

### Prompt 3 - Apprendre
Transforme `Apprendre` en zone d'amorçage par la curiosité et d'interleaving léger. Le but est d'ouvrir l'appétit d'apprendre sans forcer une lecture linéaire.

Libellés UX obligatoires:
- `Apprendre`
- `Curiosité`
- `Questions mélangées`
- `À revoir`
- `Reprendre demain`

Comportement attendu:
- ouvrir chaque entrée par une question, un contraste ou une donnée surprenante
- alterner les thèmes plutôt que de créer des blocs fermés
- proposer un rappel discret des notions vues récemment
- préparer la consolidation nocturne par une reprise courte à la prochaine visite

### Prompt 4 - Impact
Transforme `Impact` en espace de consolidation des acquis. Les chiffres doivent servir de rappel de mémoire, pas seulement d'indicateur d'activité.

Libellés UX obligatoires:
- `Impact`
- `Progression de maîtrise`
- `À revoir`
- `Maîtrisées`

Comportement attendu:
- mettre en avant ce qui a réellement changé
- relier l'impact à une notion mémorisable
- afficher un rappel court de la preuve la plus utile
- faire apparaître la progression comme une trajectoire, pas un score abstrait

### Prompt 5 - Actions
Transforme `Actions` en point de passage entre savoir et geste. Chaque action doit être précédée d'un rappel de récupération très court, puis suivie d'un feedback immédiat.

Libellés UX obligatoires:
- `Actions`
- `Feedback immédiat`
- `Rappel à revoir`
- `Mini-défi`

Comportement attendu:
- avant l'action, rappeler une notion utile en une phrase
- après l'action, montrer si le geste a renforcé l'apprentissage
- proposer un rappel à revoir si la notion n'est pas stable
- garder l'interface opérationnelle, pas pédagogique au point de ralentir

### Prompt 6 - Rapports
Transforme `Rapports` en mémoire longue et lisible. Le rapport doit aider à réviser, pas seulement à consulter.

Libellés UX obligatoires:
- `Rapports`
- `À revoir`
- `Prochaine révision`
- `Maîtrisées`
- `Reprendre demain`

Comportement attendu:
- fournir une version courte à relire rapidement
- marquer les points à revoir plus tard
- rendre la prochaine révision visible
- conserver un ton analytique et sobre

### Prompt 7 - Réseau
Transforme `Réseau` en surface de curiosité sociale et de découverte croisée. Il faut montrer les liens, les passerelles et les compléments utiles.

Libellés UX obligatoires:
- `Réseau`
- `Curiosité`
- `Questions mélangées`
- `Mini-défi`

Comportement attendu:
- faire remonter des liens entre acteurs, territoires, formats et thèmes
- favoriser la découverte par proximité thématique
- éviter une simple liste d'entités
- proposer des pistes de lecture croisées

### Prompt 8 - Micro-interactions communes
Ajoute des micro-interactions légères et récurrentes dans les rubriques concernées, sans nuisance.

Libellés UX obligatoires:
- `Feedback immédiat`
- `Rappel à revoir`
- `Mini-défi`
- `Progression de maîtrise`
- `Questions mélangées`
- `Reprendre demain`

Règles:
- feedback visible immédiatement après une interaction
- badge discret pour les éléments à revoir
- progression simple, non saturante
- consolidation nocturne uniquement passive

### Prompt 9 - Architecture minimale du Quiz
Implémente une structure produit légère pour `Quiz`:
- état `Nouvelles`
- état `Échouées`
- état `À revoir`
- état `Maîtrisées`
- champ `Prochaine révision`
- mélange thématique des sessions

Règles:
- ne pas ajouter de complexité métier
- ne pas créer de nouvelles catégories non nécessaires
- ne pas forcer une UX de type LMS

### Prompt 10 - Validation UX
Valide la cohérence de la nouvelle mécanique cognitive sur les six rubriques. Vérifie que les libellés suivants apparaissent de manière cohérente là où ils sont attendus:
- `Quiz`
- `Apprendre`
- `Impact`
- `Actions`
- `Rapports`
- `Réseau`
- `Nouvelles`
- `Échouées`
- `À revoir`
- `Maîtrisées`
- `Prochaine révision`
- `Mini-défi`
- `Feedback immédiat`
- `Questions mélangées`
- `Rappel à revoir`
- `Reprendre demain`
- `Progression de maîtrise`
- `Curiosité`

Critères de validation:
- compréhension en moins de 10 secondes de la prochaine action
- aucune notification intrusive
- aucune surcharge de contrôle
- progression lisible sur la durée
- expérience simple, claire et motivante

## Résultat attendu
Cette spec doit être utilisée comme base unique d'implémentation, rubrique par rubrique, avec les mêmes libellés UX partout où le principe cognitif est exposé.
