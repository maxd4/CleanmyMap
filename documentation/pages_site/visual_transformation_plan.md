# Plan de transformation visuelle

## Statut

Backlog visuel exécutable pour GPT-5.4 mini.

Ce plan ne doit pas être exécuté comme une refonte globale. Il complète `documentation/pages_site/plan-correction-ui-contenu.md` et ne le remplace pas.

## Objectif

Réduire les murs de texte et améliorer la compréhension des pages clés avec des visualisations utiles, sans dégrader les performances, l'accessibilité, le mobile ni le design system CleanMyMap.

## Règles de priorité

Avant chaque lot :

1. vérifier l'état réel de la page et des composants ;
2. lire la fiche canonique `pages_site` de la route ;
3. lire le design system applicable ;
4. vérifier les composants déjà existants pour éviter les doublons ;
5. ne traiter qu'un lot à la fois.

Ne pas lancer ce plan sur une page qui possède encore un bug fonctionnel, une incohérence de données ou un chantier de sécurité prioritaire.

## Contraintes critiques

- Ne pas modifier header ou footer global sans demande explicite.
- Respecter la famille de couleur et les composants canoniques.
- Pas de Three.js ou WebGL par défaut.
- Ne pas ajouter une dépendance si SVG, CSS, Canvas léger ou une bibliothèque déjà présente suffit.
- Respecter `prefers-reduced-motion` et les modes d'affichage du site.
- Le contenu essentiel doit rester accessible sans animation, hover ou JavaScript complexe.
- Toute visualisation doit avoir un sens métier clair ; supprimer les effets purement décoratifs.
- Mobile d'abord : pas de scroll horizontal ni de contrôle inutilisable au tactile.
- Ne jamais inventer de chiffres ou de sources.

## Ordre de traitement

### P1 — Apprendre : transformer les explications les plus denses

Périmètre prioritaire :

- `/learn/bonnes-pratiques`
- `/learn/comprendre`
- composants pédagogiques associés, dont les limites planétaires si elles sont toujours actives

But : remplacer les longues successions de cartes ou paragraphes par une lecture progressive : synthèse visuelle, détails à la demande, sources accessibles.

Livrable attendu :

- un module visuel principal maximum par sujet ;
- navigation clavier complète ;
- contenu textuel essentiel conservé dans le DOM ;
- aucun doublon avec les modules déjà présents.

Validation :

- test mobile ;
- navigation clavier ;
- réduction de mouvement ;
- absence de régression de contenu.

### P2 — Communauté et réseau : réduire la surcharge sans masquer l'action

Périmètre :

- `/sections/community`
- `/sections/messagerie`
- autres vues réseau uniquement si la surcharge est confirmée

But : donner la priorité aux conversations, acteurs, sujets et actions utiles plutôt qu'aux panneaux de contexte répétés.

Livrable attendu :

- hiérarchie plus claire ;
- informations secondaires repliables ou à la demande ;
- pas de résumé IA automatique sans workflow, coût, consentement et gouvernance explicites.

### P3 — Rapports d'impact : visualiser sans surcharger

Périmètre :

- `/reports`
- composants de synthèse et d'évolution temporelle

But : rendre les tendances et comparaisons compréhensibles sans multiplier jauges, compteurs ou animations.

Livrable attendu :

- KPI principaux limités ;
- un graphique par question analytique ;
- unités, période, source et méthode visibles ;
- fallback textuel ou tabulaire accessible.

### P4 — Déclaration d'action : réduire la charge cognitive

Périmètre :

- `/actions/new`
- composants du formulaire de déclaration

But : simplifier la saisie sans transformer le formulaire en jeu ni masquer les champs importants.

Livrable attendu :

- progression claire ;
- sélecteurs visuels seulement lorsqu'ils améliorent réellement la décision ;
- erreurs proches des champs ;
- aucune perte de précision ni d'accessibilité.

### P5 — Carte : améliorer l'exploration spatiale avec prudence

Périmètre :

- `/actions/map`
- feed et couches cartographiques existantes

But : faciliter la compréhension spatiale sans alourdir la carte ni dupliquer les fonctions existantes.

Livrable attendu :

- priorité à la fluidité ;
- détails chargés à la demande ;
- pas de nouvelle couche lourde sans mesure de performance ;
- mobile testé sur interactions tactiles.

## Critères de décision avant implémentation

Pour chaque idée, répondre à ces cinq questions :

1. Quel mur de texte ou problème de compréhension précis est corrigé ?
2. Quel composant existant peut être réutilisé ?
3. Quel coût performance ou complexité est ajouté ?
4. Comment l'information reste accessible sans animation ni hover ?
5. Quel test prouve que la transformation n'a pas dégradé la page ?

Si une réponse manque, ne pas implémenter l'idée.

## Critères de fin d'un lot

- la page reste fonctionnellement identique ou mieux définie ;
- le texte visible est réduit sans perte d'information essentielle ;
- la visualisation répond à une question claire ;
- aucune dépendance superflue n'est ajoutée ;
- accessibilité et mobile sont vérifiés ;
- la fiche `pages_site` ou la liste de propositions locale est mise à jour si nécessaire.

## Prompt exécutable

```text
Améliore visuellement une seule page CleanMyMap à partir de ce plan.

Objectif : réduire une surcharge textuelle ou améliorer la compréhension avec un visuel utile.

Avant toute modification : lis la fiche canonique de la route, le design system pertinent et l'état réel du code. Réutilise l'existant et ne crée aucun doublon.

Contraintes : une seule transformation principale par lot ; pas de nouvelle dépendance sans nécessité ; mobile, clavier et prefers-reduced-motion obligatoires ; contenu essentiel accessible sans hover ni animation ; aucun chiffre ni source inventés.

Livrable : modification ciblée, validations pertinentes, résumé du gain obtenu et risques restants.
```
