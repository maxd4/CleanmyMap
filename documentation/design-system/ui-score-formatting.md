# Affichage des scores dans l'interface

Cette règle est normative pour toutes les surfaces utilisateur de CleanMyMap :
cartes, tooltips, popups, corridors, historiques, dashboards, pilotage,
administration, rapports et composants partagés.

## Règle permanente

Les scores restent stockés et calculés sur l'échelle numérique interne `0–100`,
mais ils sont toujours présentés à l'utilisateur comme des pourcentages :

```txt
63     → 63 %
63.5   → 63,5 %
```

Le rendu doit utiliser le formatage commun :

```txt
apps/web/src/lib/formatters/score.ts
```

Les valeurs ne doivent être ni multipliées ni divisées pour changer leur
échelle. Le helper applique uniquement le format d'affichage français et
préserve la précision demandée par la surface. Les helpers spécialisés, comme
`formatThresholdScore()`, doivent déléguer à ce formatage commun.

Les libellés, titres, légendes, valeurs de tableaux, textes de rapports,
tooltips, popups et attributs d'accessibilité ne doivent pas afficher un score
sous les formes suivantes :

```txt
x/100
x / 100
x sur 100
```

Ils doivent utiliser `x %`. Cette règle s'applique aussi aux exemples
documentaires décrivant un rendu utilisateur.

## Formules et données internes

Une occurrence de `/ 100` reste autorisée lorsqu'elle appartient à une formule
technique non rendue telle quelle à l'utilisateur, par exemple une normalisation
du domaine ou une formule de projection. Elle ne doit pas être copiée dans un
libellé de score.

Le score observé, le score projeté, la priorité, la confiance et les autres
indicateurs conservent leurs contrats métier et leurs seuils existants. Seul
leur format de présentation est concerné par cette règle.

## Contrôle anti-régression

Le test suivant protège les sources UI contre le retour des anciens libellés :

```txt
apps/web/src/lib/formatters/score-display-guard.test.ts
```

Tout nouveau rendu de score doit être couvert par un test lorsque sa surface
possède déjà des tests, avec au minimum un cas entier et, si pertinent, un cas
décimal.

Pour la carte d'actions, cette règle complète la méthodologie métier disponible
dans [Méthodologie de la carte d'actions](../product/methodologie-carte-actions.md).
