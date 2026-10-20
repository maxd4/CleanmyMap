# Visualisation utile — contrat de design

**Statut : `CURRENT`**

Une visualisation sert d’abord la compréhension, la comparaison ou une
décision. La décoration seule ne justifie ni un graphique, ni une animation,
ni une nouvelle dépendance.

## Règles de décision

- préférer un texte, un tableau ou une valeur structurée lorsque cela transmet
  mieux l’information ;
- lorsqu’un visuel est utile, conserver une alternative textuelle accessible et
  un rendu compréhensible sans couleur seule ;
- réutiliser les SVG, composants et Recharts déjà présents avant d’introduire
  une nouvelle dépendance ;
- réserver les cartes, comparaisons, axes et annotations aux relations ou
  tendances réellement utiles au lecteur ;
- réserver les animations au feedback ou à la compréhension d’un changement,
  selon [`MOTION_TRANSITIONS.md`](./MOTION_TRANSITIONS.md), et respecter
  `prefers-reduced-motion`, `useReducedMotion()` et le mode `sobre`.

## Règles de composition d'un visuel explicatif

- **Un message principal par visualisation.** Le titre répond à la question de lecture ; la légende indique comment lire les marques et les unités ; les notes portent le périmètre et les limites.
- **Importance visuelle proportionnée.** Les faits et valeurs importants doivent être perceptibles sans rechercher des microétiquettes dans un décor ; un graphique n'exige pas systématiquement un hero, un fond sombre ou un cadre `glass`.
- **Comparaison honnête.** Ne pas tronquer arbitrairement les échelles ou juxtaposer des mesures incompatibles pour obtenir une différence plus spectaculaire. Signaler les échelles, périodes, regroupements et normalisations réellement utilisés.
- **Couleurs sémantiques.** Les teintes de bloc peuvent décorer le cadre ; les couleurs représentant observation, projection, catégorie ou intensité sont gouvernées par les contrats métier canoniques, et doivent être explicites dans la légende.
- **Données manquantes.** Distinguer zéro, non mesuré, indisponible, masqué par permission et erreur de récupération. Ne jamais fabriquer une valeur pour compléter une carte ou un graphique.
- **Progressive disclosure.** Afficher d'abord le résumé et le fait majeur ; permettre l'accès au détail scientifique et aux données sources existantes lorsque disponibles. Ne pas masquer une limite importante dans un tooltip inaccessible.

## Cartographie et géospatial

Les cartes Leaflet et les moteurs de données géospatiales conservent leurs contrats fonctionnels et scientifiques ; cette section gouverne seulement **la compréhension de leur présentation**.

1. Une carte publique possède un intitulé de vue, un contexte spatial et temporel compréhensible, et une légende visible ou facilement accessible. Chaque couleur, symbologie ou couche utile est nommée.
2. Les marqueurs, états et couleurs qui portent une signification doivent être compréhensibles sans couleur seule ; un libellé, une liste liée ou une représentation structurée peut fournir une alternative lorsque le rendu graphique est insuffisant.
3. Les filtres, modes et sélections doivent annoncer leur effet réel ; distinguer observation, estimation, projection, déclaration et absence de données sans les présenter comme interchangeables.
4. Les panneaux, popovers et contrôles ne doivent pas masquer sans recours les résultats sur petit écran. L'état sélectionné reste identifiable au clavier et après changement de viewport, lorsque le composant prend en charge ces interactions.
5. Si la carte exige un défilement ou une interaction bidimensionnelle, le restreindre à sa zone ; le reste de la page conserve le reflow attendu par WCAG 1.4.10, qui prévoit des exceptions pour les cartes.
6. Conserver une alternative utilisable et accessible aux informations importantes de la carte (liste ou tableau existant, texte de synthèse, etc.), sans créer un second moteur de calcul ni doubler la source de données.
7. Une donnée géographique ou environnementale affiche les unités, le périmètre, la provenance et les limites que son contrat canonique exige ; ne pas les déduire visuellement de la couleur de famille.

## Graphiques, KPI et tableaux

`DATA_DISPLAY_TABLES_KPI.md` conserve l'autorité sur la composition de `StatCard` et les tables. Pour un graphique, vérifier le titre, les séries, l'unité, l'axe, la période, la présence d'une alternative structurée et l'accessibilité des légendes. Les animations d'entrée ne doivent pas retarder l'accès à une valeur indispensable. Éviter les 3D décoratives et effets qui faussent les rapports visuels.

## Accessibilité et robustesse

Toute visualisation doit rester lisible au clavier, conserver un titre ou un
libellé utile, fournir les données importantes dans une forme textuelle ou
structurée et éviter le layout shift. Les modes d’affichage ne changent pas les
données métier.

Les contrats de cartes, surfaces, couleurs, états et titres restent dans leurs
documents spécialisés ; ce fichier ne les duplique pas.

### Performance visuelle et stabilité

Une page agréable est également stable et réactive. Pour les interfaces riches, surveiller les métriques Web Vitals dans leur contexte réel : **LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1 au 75e percentile** sont les seuils « bons » publiés par web.dev, pas des résultats CleanMyMap observés. Les mesures de terrain et les tests de laboratoire ne sont pas interchangeables.

- Réserver la place des cartes, graphiques, images et skeletons avant chargement lorsque la taille est connue ; éviter les changements de hauteur brusques.
- Ne pas télécharger un décor coûteux pour un gain de style non essentiel ; privilégier les composants et assets existants.
- Pour les contrôles cartographiques et graphiques gourmands, préserver le temps de réponse et la compréhension des retours utilisateur avant d'ajouter des animations ou des couches visuelles.
- Ne pas améliorer une capture en supprimant artificiellement les données ou en remplaçant un service par un mock présenté comme runtime.

## Vérification et références

Vérifier au minimum une vue avec données, sans données, en échec et avec sélection active lorsque ces états sont disponibles ; comparer mobile, desktop, clavier, modes d'affichage, et mesurer le comportement plutôt que l'apparence seule.

Les références W3C indiquent les critères d'accessibilité applicables ; USWDS,
ARIA APG et web.dev apportent des repères de conception ou de mesure. Aucun
lien externe ni seuil publié ne constitue une preuve que CleanMyMap est déjà
conforme ou qu'une cible de performance est atteinte.

- W3C, reflow : https://www.w3.org/WAI/WCAG22/Understanding/reflow.html
- W3C, contraste non textuel : https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html
- W3C, ARIA Authoring Practices : https://www.w3.org/WAI/ARIA/apg/
- web.dev, Core Web Vitals : https://web.dev/articles/vitals
