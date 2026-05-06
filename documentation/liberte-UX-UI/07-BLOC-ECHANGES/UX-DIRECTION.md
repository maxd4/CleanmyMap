# Direction UX — Bloc Échanges

## Mission

Fluidifier les conversations utiles au travail. UX **conversationnelle orientée efficacité**.

---

## Routes et fichiers réels

| Rubrique | Route | Fichier |
|---|---|---|
| Messagerie / chat | À confirmer | `apps/web/src/components/chat/` |

> ⚠️ Les routes `/sections/messagerie` et `/sections/dm` de l'ancien doc **n'ont pas été trouvées**. Le dossier `components/chat/` existe mais sa route de rattachement est inconnue. **À identifier avant l'audit.**

---

## Composants clés identifiés

- `apps/web/src/components/chat/` — messagerie
- `NotificationBell` → `apps/web/src/components/navigation/notification-bell.tsx`

---

## Identité visuelle (rose/pink — conversation)

Couleur d'accent : **`rose`** (non assigné explicitement dans la charte — conserver `pink` existant jusqu'à confirmation)

- Fond : `bg-[linear-gradient(180deg,rgba(73,27,56,0.95),rgba(92,32,67,0.98))]`
- Glow : `from-pink-500/14 via-fuchsia-500/10 to-transparent`
- Bordure : `border-pink-300/22` / hover : `hover:border-pink-300/42`
- Surface : `bg-[rgba(108,43,84,0.82)]`
- Ombre : `shadow-[0_24px_56px_-32px_rgba(236,72,153,0.28)]`
- Chips : `bg-pink-500/14 text-pink-100 border-pink-200/18`

---

## Rubriques à auditer

| Priorité | Rubrique | Note |
|---|---|---|
| [CRITIQUE] | Messagerie principale | Route à confirmer |
| [HAUTE] | NotificationBell | Entrée nav globale vers échanges |
| [MOYENNE] | Messages privés | Route à confirmer |

---

## Points de dette

- Routes de messagerie non trouvées — feature partielle ou en cours ?
- `NotificationBell` : vérifier tokens couleur et badge charte

---

## Règles d'interface

- Conversations récentes et non lus toujours visibles
- Contexte de discussion toujours présent (sujet, interlocuteur, dernière action)
- Actions proches du fil — mobile one-hand

## À éviter

- Chat trop ludique, perte de contexte liste/détail, actions critiques cachées
