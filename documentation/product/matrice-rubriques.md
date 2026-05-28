# Matrice rubriques

## Structure en 5 blocs (homepage)

```mermaid
flowchart LR
  B1["Bloc 1\nAccueil & Pilotage"]
  B2["Bloc 2\nAgir"]
  B3["Bloc 3\nCartographie & Impact"]
  B4["Bloc 4\nRéseau & Discussions"]
  B5["Bloc 5\nApprendre"]

  B1 --> ACC["/accueil"]
  B1 --> DASH["/dashboard"]
  B1 --> PROFIL["/profil"]
  B1 --> FEEDBACK["/sections/feedback"]
  B1 --> PIL["/pilotage"]
  B1 --> SPONSOR["/sponsor-portal"]

  B2 --> NEW["/actions/new"]
  B2 --> ROUTE["/sections/route"]
  B2 --> SIGNAL["/signalement"]
  B2 --> METEO["/sections/weather"]
  B2 --> GUIDE["/sections/guide"]
  B2 --> KIT["/sections/kit"]

  B3 --> MAP["/actions/map"]
  B3 --> SANDBOX["/sections/sandbox"]
  B3 --> OBS["/observatoire"]
  B3 --> REP["/reports"]
  B3 --> BADGES["/sections/gamification"]

  B4 --> NET["/partners/network"]
  B4 --> ANNUAIRE["/partners/dashboard"]
  B4 --> MSG["/sections/messagerie"]
  B4 --> COMMUNITY["/sections/community"]
  B4 --> OPENDATA["/sections/open-data"]

  B5 --> HUB["/learn/hub"]
  B5 --> COMPRENDRE["/learn/comprendre"]
  B5 --> QUIZ["/learn/sentrainer"]
  B5 --> PRATIQUES["/learn/bonnes-pratiques"]
  B5 --> RESSOURCES["/learn/ressources"]
```

## Familles autonomes

- Auth & Onboarding : `/sign-in`, `/sign-up`, `/onboarding`, `/onboarding/localisation`
- Institutionnel & Légal : `/contact`, `/conditions-*`, `/mentions-legales`, `/politique-*`, `/en`
- Système & Utilitaires : `/reglages`, `/form-comparison`, `/declaration-simple`, `/preview/actions/new`, `/error/429`
- Admin & Super-admin : `/admin`, `/admin/forms`, `/admin/services`, `/admin/godmode`
- Print & Export : `/prints/report`

## Correspondance bloc -> usage

| Bloc | Teinte | Rôle principal | Sortie attendue |
|---|---|---|---|
| Accueil & Pilotage | `amber` / `brun` | Entrée personnelle + gouvernance | reprendre, piloter, administrer |
| Agir | `emerald` | Passage à l'action terrain | déclaration, itinéraire, signalement |
| Cartographie & Impact | `sky` / `red` | Lecture territoriale + preuve | carte, rapports, badges |
| Réseau & Discussions | `indigo` | Mise en relation | partenaires, messagerie, communauté |
| Apprendre | `yellow` | Montée en compétence | point de départ, quiz, guides |

## Blocs fusionnés (ancienne structure)

| Ancien bloc | Fusionné dans |
|---|---|
| Piloter | Bloc 1 — Accueil & Pilotage |
| Impact | Bloc 3 — Cartographie & Impact |
| Discussion | Bloc 4 — Réseau & Discussions |

## Source technique

- `apps/web/src/lib/navigation.ts`
- `documentation/liberte-UX-UI/rubriques_utilite_impact_.md`

## Routes canoniques et alias

- `/explorer` et `/reports` sont les routes canoniques des pages Sommaire et Rapports.
- `/sections/feedback`, `/sections/community`, `/sections/messagerie` et `/sections/open-data` sont les routes canoniques des sections publiques correspondantes.
- `/community`, `/messagerie` et `/open-data` redirigent vers leurs équivalents `/sections/*` et restent des alias legacy.
- `/declaration` redirige vers `/actions/new` et reste un alias legacy.
- `/sandbox` redirige vers `/sections/sandbox` et reste un alias legacy.
- `/observatoire` est une route publique distincte de `/reports`.

## Règle de maintenance

Quand un bloc change, mettre à jour cette matrice en même temps que `rubriques_utilite_impact_.md` et le registre de navigation. La matrice n'est pas un commentaire : c'est un contrat de navigation.
