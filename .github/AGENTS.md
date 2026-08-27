# Gouvernance locale — `.github`

Héritage : gouvernance racine → ce périmètre GitHub. Ces règles concernent les
workflows, Dependabot et les autres contrôles versionnés sous `.github/`.

## Workflows et sécurité

- conserver des permissions GitHub Actions minimales, au niveau le plus étroit
  compatible avec l'étape concernée ;
- ne pas supprimer ni affaiblir un check de sécurité ou de gouvernance sans
  justification explicite et vérifiable ;
- conserver CodeQL, les checks CI et les règles de protection attendues ;
- maintenir une `concurrency` cohérente avec le workflow et un
  `cancel-in-progress` adapté à sa nature ;
- conserver le cache npm basé sur le lockfile canonique `package-lock.json`.

Les workflows actuels appliquent notamment des permissions globales vides,
puis accordent les droits nécessaires au niveau du job. Toute évolution doit
préserver cette réduction de privilèges.

## Dependabot et secrets

- limiter Dependabot au bruit utile sans masquer les mises à jour de sécurité ;
- ne jamais ajouter d'ignore global ou de règle qui dissimule une security
  update sans justification explicite ;
- ne jamais mettre de secret, token ou valeur d'environnement réelle dans un
  workflow, une configuration YAML ou une documentation.

## Validation obligatoire

Tout changement sous `.github/` doit passer :

```bash
npm run check:github-actions
```

Ajouter les checks documentaires ou de sécurité directement concernés. Ne pas
valider un workflow uniquement par lecture si le garde-fou local est
disponible.
