# Où agir — Présentation détaillée

## Rôle et parcours

`/sections/route` est une surface protégée du bloc Agir. Elle aide un bénévole
à choisir où agir à partir de signalements Trash Spotter validés. Le calcul est
toujours explicite : l'utilisateur ajuste ses préférences puis active le CTA.
Il n'y a aucun calcul automatique au chargement.

Le contrat V1 utilisateur contient uniquement :

```ts
{
  travelBudgetMinutes: number;
  maxStops: number;
  priorityVsTravel: number;
}
```

Les valeurs par défaut sont `60` minutes, `6` arrêts et `65` pour l'arbitrage
priorité / déplacement. `maxStops` est borné de 1 à 12 et
`priorityVsTravel` de 0 à 100. Le draft de `sessionStorage` ne contient que ces
préférences ; il ne contient aucune coordonnée précise.

## Origines

Le calcul peut utiliser :

1. la position actuelle du navigateur (`browser`), demandée seulement après le
   clic de calcul ;
2. un point choisi sur la carte (`map`), conservé uniquement en mémoire et
   modifiable ou réinitialisable ;
3. le centre approximatif de la zone enregistrée (`approximate_saved_area`),
   résolu côté serveur lorsque l'origine explicite n'est pas disponible.

Un refus ou une indisponibilité GPS n'empêche pas l'envoi de la requête. Si
aucune origine de secours n'est disponible, l'API répond `422` avec l'erreur
`A route origin is required.`. Les coordonnées précises ne sont pas écrites
dans `sessionStorage`, `localStorage`, l'URL, le hash ou un cookie de route.

## Sélection et routage

Le planner part réellement de l'origine et compte origine → premier arrêt. Il
estime la marche à 4,5 km/h, respecte strictement le budget et sélectionne au
plus `maxStops`. Priorité et déplacement sont comparés après normalisation sur
`[0, 1]`. Le résultat reste déterministe grâce à un ordre de départage stable.

Les candidats proviennent de Trash Spotter avec statut `validated`, type
`spot`, coordonnées présentes et hard gate bénévole conservé. Les candidats
dangereux sont exclus fail-closed.

FOSSGIS reçoit `[origin, stop1, stop2, ...]`. Le premier segment représente donc
origine → premier arrêt. Si le réseau dépasse le budget, le plus long préfixe
compatible est conservé et la géométrie fallback est reconstruite sans second
appel FOSSGIS. Un fallback réseau déjà trop long est lui aussi réduit.

La géométrie `network` indique le provider et le profil piéton configuré. La
géométrie `fallback` est explicitement estimée et ne doit pas être présentée
comme une précision réseau.

## Réponse serveur

Chaque réponse exploitable expose :

- `status: "ok" | "empty" | "degraded"` ;
- `origin`, `travelDistanceKm`, `travelMinutes`, `travelBudgetMinutes` et
  `withinBudget` ;
- `serviceMinutesEstimate: null` et `totalMinutesEstimate: null` ;
- `generatedAt` et `engineVersion` ;
- `diagnostics.loaded`, `eligible`, `excluded`, `selected`,
  `sourcePartial` et `truncated` ;
- les diagnostics détaillés du planner, le cas échéant.

`selected` est égal au nombre réel d'arrêts dans `stops`. `travelMinutes` ne
peut pas dépasser `travelBudgetMinutes`.

Le statut vaut `ok` pour une réponse nominale, `empty` lorsque l'absence de
point exploitable est démontrée, et `degraded` lorsque la source est partielle,
tronquée ou que le routage repose sur un fallback significatif. Les champs
`dataStatus`, `sourceHealth`, `isTruncated`, `scoreBreakdown`, `tradeoffs` et
`proactiveAssistant` restent disponibles pour la compatibilité et le contexte
opérationnel.

## Authentification et états UX

La route est protégée côté serveur. En localhost de développement, le bypass
officiel peut fournir l'état d'authentification effectif à l'UI sans session ou
token Clerk artificiel. Le runtime Clerk Development reste néanmoins requis
pour initialiser l'application ; aucune clé de production n'est utilisée en
local.

La page présente un état de chargement, un état vide, une erreur d'origine et un
état dégradé. Elle affiche sobrement l'origine effectivement utilisée, mais
jamais ses coordonnées.

## Composants et sources

- page : `apps/web/src/app/(app)/sections/route/page.tsx` ;
- surface : `apps/web/src/components/sections/rubriques/route-section.tsx` ;
- formulaire : `route/components/route-constraints-form.tsx` ;
- carte et origine : `route/components/route-map.tsx` ;
- requête et garde anti-double : `route/route-request.ts` ;
- draft non sensible : `route/route-draft-storage.ts` ;
- source API : `apps/web/src/app/api/route/recommend/route.ts`.
