# Admin & Super-admin

Administration, modération, services, audit et supervision avancée.

Un profil personnel incomplet n'empêche pas l'affichage de cette page : le
rappel de configuration est non bloquant. L'accès reste déterminé par
l'authentification et les permissions administratives propres à chaque surface.

## Inventaire des pages

L’inventaire exhaustif des routes canoniques, alias et fiches est tenu dans
[`INDEX.md`](../../INDEX.md). Le contrat de famille runtime est décrit dans
[`PAGE_FAMILIES.md`](../../PAGE_FAMILIES.md).


## Points d'accès particuliers

### Banque de quiz

La page `/admin/quiz-bank` exige exactement le rôle :

```txt
admin
```

Un utilisateur non connecté ou d'un autre rôle reçoit `notFound()`.

### Godmode

`/admin/godmode` reste réservé au profil `max`.

## Snapshots

Les snapshots sont colocalisés dans le dossier de chaque page canonique, sous
`screenshots/desktop/` ou `screenshots/mobile/`.
