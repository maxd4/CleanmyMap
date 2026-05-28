# Homepage

Famille autonome de la page d'accueil et de sa reprise de session.

## Routes canoniques

| Route | Fiche | Type de page | Statut | Scope | Capture disponible | Priorité | Fichier source principal |
|---|---|---|---|---|:---:|---|---|
| `/` | [Page d'accueil](./root/README.md) | homepage | public | à corriger | oui | faible | apps/web/src/app/page.tsx |
| `/accueil` | [Accueil](./accueil/README.md) | redirection | alias | hors scope | non | faible | apps/web/src/app/accueil/page.tsx |



## Notes

- Les fiches de cette famille suivent le format d'audit standard du dossier `pages_site`.
- `/` est la route canonique de la homepage et toutes les surfaces internes doivent l'utiliser en priorité.
- `/accueil` est un alias de compatibilité qui redirige vers `/`.
- Les captures officielles, quand elles existent, vivent dans `photo/desktop/` et `photo/mobile/` à la racine de la famille et sont en WebP.
