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

## Protocole des chantiers GitHub

Pour tout chantier portant sur l'hygiène GitHub, suivre cet ordre et s'arrêter
dès que les invariants demandés sont prouvés :

```text
REMOTE_BASELINE
→ PR/branches
→ ruleset/protection
→ Dependabot
→ CodeQL
→ Secret Scanning
→ corrections locales nécessaires
→ validation finale
→ relecture distante
```

Règles d'efficacité :

- lire l'état GitHub distant avant une exploration large du checkout ;
- privilégier l'état courant aux anciens commits pour l'hygiène GitHub actuelle ;
- remonter dans l'historique uniquement pour établir une cause ou une régression ;
- fermer une PR ou supprimer une branche uniquement avec l'autorisation explicite
  de l'utilisateur ;
- ne jamais dismiss une alerte sécurité pour obtenir zéro alerte : corriger la
  cause, sauf faux positif démontré et explicitement traité ;
- après une correction CodeQL, vérifier le run GitHub du SHA exact concerné ;
- utiliser des validations ciblées pendant l'itération ;
- exécuter le full/pre-push une seule fois sur le candidat final, sauf
  modification ultérieure invalidant la preuve.

Classes de chantier :

| Classe | Périmètre |
| --- | --- |
| `REMOTE_HYGIENE` | PR, branches, rulesets, protection et réglages GitHub courants |
| `DEPENDABOT_VERSION_UPDATE` | Mise à jour de version non liée à une alerte de sécurité |
| `DEPENDABOT_SECURITY_UPDATE` | Mise à jour ou correction demandée par Dependabot security |
| `CODEQL_FINDING` | Alerte CodeQL et preuve du run sur le SHA corrigé |
| `SECRET_SCANNING_FINDING` | Secret Scanning ou Push Protection, sans secret dans le dépôt |
| `CI_FAILURE` | Échec d'un workflow à classer par comparaison avec un run antérieur |
| `HOST_ENVIRONMENT` | Outil, runner, permission ou environnement local indisponible |

## Validation obligatoire

Tout changement sous `.github/` doit passer :

```bash
npm run check:github-actions
```

Ajouter les checks documentaires ou de sécurité directement concernés. Ne pas
valider un workflow uniquement par lecture si le garde-fou local est
disponible.
