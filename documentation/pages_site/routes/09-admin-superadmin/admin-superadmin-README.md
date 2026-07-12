# Admin & Super-admin

Administration, modération, services, audit et supervision avancée.

## Routes canoniques

| Route | Fiche | Accès runtime | Source principale |
|---|---|---|---|
| `/admin` | [Administration](./admin/admin-README.md) | `protected` + permissions internes | `apps/web/src/app/(app)/admin/page.tsx` |
| `/admin/forms` | [Administration des formulaires](./admin-forms/admin-forms-README.md) | `protected` + permissions internes | `apps/web/src/app/(app)/admin/forms/page.tsx` |
| `/admin/gamification/xp-audit` | [XP Audit](./admin-gamification-xp-audit/admin-gamification-xp-audit-README.md) | `protected` + permissions internes | `apps/web/src/app/admin/gamification/xp-audit/page.tsx` |
| `/admin/godmode` | [Administration avancée](./admin-godmode/admin-godmode-README.md) | `max-only` | `apps/web/src/app/(app)/admin/godmode/page.tsx` |
| `/admin/quiz-bank` | [Banque de quiz](./admin-quiz-bank/admin-quiz-bank-README.md) | `admin-only` | `apps/web/src/app/(app)/admin/quiz-bank/page.tsx` |
| `/admin/services` | [Administration des services](./admin-services/admin-services-README.md) | `protected` + permissions internes | `apps/web/src/app/(app)/admin/services/page.tsx` |

## Points d'accès particuliers

### Banque de quiz

La page `/admin/quiz-bank` exige exactement le rôle :

```txt
admin
```

Un utilisateur non connecté ou d'un autre rôle reçoit `notFound()`.

### Godmode

`/admin/godmode` reste réservé au profil `max`.

## Captures

Un seul dossier photo centralisé au niveau de la famille.

Ne pas créer de dossier photo par route enfant.
