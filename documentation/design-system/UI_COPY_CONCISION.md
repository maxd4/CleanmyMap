# Concision des textes d’interface — contrat `CURRENT`

Ce contrat s’applique à tout texte visible dans CleanMyMap Web et Mobile, pour
toute nouvelle interface et toute modification de texte. Il complète les
contrats de composants, de contenu métier et d’accessibilité sans les remplacer.

## Règle de rédaction

Afficher le minimum nécessaire pour comprendre la situation et agir : un titre
court, la donnée utile, un état compréhensible et une action claire. Privilégier
les valeurs réelles avec leurs unités, les pictogrammes compréhensibles, les
statuts courts et une hiérarchie visuelle nette plutôt que des paragraphes.

Supprimer les introductions, répétitions, explications du fonctionnement,
justifications techniques et précautions génériques qui n’aident pas à prendre
une décision. Ne pas exposer aux utilisateurs ordinaires les notions internes
comme API, contrat, provenance, persistance, projection ou hypothèse technique.

Une information secondaire peut être placée dans un détail accessible à la
demande. Les explications méthodologiques relèvent de la documentation ou de
`/methodologie`. La concision ne doit toutefois pas effacer une incertitude
matérielle, inventer une valeur, ni présenter une estimation comme une mesure.

## Informations à conserver

La brièveté ne justifie jamais de supprimer :

- les instructions nécessaires pour réaliser correctement une action ;
- les erreurs utiles, avec une correction ou une reprise compréhensible ;
- les avertissements de sécurité et obligations légales applicables ;
- les contenus pédagogiques indispensables à la compréhension ou à la décision ;
- les noms accessibles des icônes et contrôles pour les technologies d’assistance.

Ne pas remplacer des paragraphes par une accumulation de badges, infobulles ou
accordéons. Le contenu essentiel et l’action attendue doivent rester repérables
et accessibles au clavier, au lecteur d’écran et sur petit écran.

## Maquettes et revue

Une maquette explicite fournie pour le lot gouverne la composition et le texte
dans les limites de la sécurité, de l’exactitude et de l’accessibilité.

Avant livraison, vérifier que chaque texte visible aide à identifier le sujet,
comprendre l’état ou accomplir une action ; retirer les formulations qui
n’apportent rien à ces buts, tout en gardant les informations nécessaires
listées ci-dessus. Vérifier aussi qu’aucune donnée manquante ou estimée n’est
présentée comme un fait mesuré.

## Frontières

Ce contrat gouverne le choix et la quantité de texte. Les sources spécialisées
restent propriétaires de la géométrie des titres (`PAGE_HEADER.md`), des états
et erreurs (`STATES_FEEDBACK.md`), des formulaires (`FORMS_CONTROLS.md`), des
noms accessibles (`ICONS.md`) et des contenus métiers ou légaux concernés.
