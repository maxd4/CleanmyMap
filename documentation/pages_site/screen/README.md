# Captures screen

Ce dossier contient les captures desktop PNG générées automatiquement pour les routes du site.

## Commande unique

```bash
npm run screenshots:screen
```

## Ce que fait la commande

- charge la liste canonique des routes depuis [`capture-routes.mjs`](./capture-routes.mjs)
- ouvre chaque route dans Playwright
- attend le chargement, fait un auto-scroll et laisse la page se stabiliser
- exécute les actions de pré-capture déclarées dans la configuration
- capture un PNG desktop full page
- écrit l'image dans `documentation/pages_site/screen/<family>/<slug>/desktop.png`

## Contrôle sémantique complémentaire

La capture écran ne suffit pas pour valider une page CleanMyMap.

Pour chaque route modifiée, compléter la capture par un export manuel `.MD this page` dans Chrome via `Alt+M`, puis comparer l'extraction Markdown avec le PNG desktop.

Ce contrôle sert à vérifier :

- la hiérarchie des titres
- les statistiques et leurs libellés
- les CTA et cartes d'action
- les sources ou statuts affichés
- l'ordre de lecture DOM par rapport à l'ordre visuel
- les `aria-label` et le texte accessible

## Actions avant capture

La configuration supporte des actions optionnelles avant capture :

- fermer le bandeau cookies
- ouvrir un menu de bloc
- ouvrir le menu de préférences
- cliquer le menu profil
- cliquer un sélecteur arbitraire
- attendre quelques millisecondes

Si l'une de ces routes doit être validée pour merge, refaire ensuite l'export `.MD this page` afin de comparer la version finale avec la capture.

## Authentification

Pour capturer des pages protégées en local, utilisez soit :

- le bypass de développement sur localhost avec le rôle créateur
- un `storageState` Playwright via `SCREENSHOT_STORAGE_STATE`

## Notes

- les captures sont desktop uniquement
- le format de sortie est PNG uniquement
- les captures legacy dans `documentation/liberte-UX-UI/` restent historiques tant que leur pipeline n'est pas migré
