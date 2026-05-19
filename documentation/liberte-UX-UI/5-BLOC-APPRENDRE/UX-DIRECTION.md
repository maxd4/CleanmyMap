# Direction UX — Bloc Apprendre

## Mission

Faire monter en compétence sans ressembler à une plateforme scolaire classique. Apprendre juste ce qu'il faut, au bon moment, en moins d'une minute de lecture utile par carte.

---

## Routes et fichiers réels

| Rubrique | Route | Fichier |
|---|---|---|
| Hub éducatif | `/learn/hub` | `apps/web/src/app/learn/hub/page.tsx` |
| Comprendre | `/learn/comprendre` | `apps/web/src/app/learn/comprendre/page.tsx` |
| S'entraîner | `/learn/sentrainer` | `apps/web/src/app/learn/sentrainer/page.tsx` |
| Bonnes pratiques | `/learn/bonnes-pratiques` | `apps/web/src/app/learn/bonnes-pratiques/page.tsx` |
| Ressources | `/learn/ressources` | `apps/web/src/app/learn/ressources/page.tsx` |

> **Note :** Toutes les routes `learn/*` sont **à la racine** (pas dans `(app)/`) — vérifier si accessibles sans connexion.

---

## Composants clés identifiés

- `apps/web/src/components/learn/` — composants éducatifs

---

## Identité visuelle (yellow — apprentissage)

Couleur d'accent charte : **`yellow`**

- Fond de bloc : `bg-[linear-gradient(180deg,rgba(64,48,12,0.95),rgba(82,62,15,0.98))]`
- Glow : `from-yellow-400/14 via-amber-400/8 to-transparent`
- Bordure : `border-yellow-300/20` / hover : `hover:border-yellow-300/40`
- Surface : `bg-[rgba(110,85,25,0.82)]`
- Ombre : `shadow-[0_24px_56px_-32px_rgba(251,191,36,0.26)]`
- Chips : `bg-yellow-400/14 text-yellow-100 border-yellow-200/18`

---

## Direction UX

- Le hub est un **index + reprise** — pas de duplication du contenu complet des pages
- `Comprendre` : ordres de grandeur lisibles, une hypothèse à la fois, renvoi vers Méthodologie
- `S'entraîner` : quiz courts et répétables (SRS si implémenté)
- `Bonnes pratiques` : séparé du terrain opérationnel du bloc Agir
- Les 4 rubriques accessibles depuis la navigation, pas seulement depuis le hub
- Le guide terrain **a quitté ce bloc** → bloc Agir

---

## Rubriques à auditer

| Priorité | Rubrique | Route | Note |
|---|---|---|---|
| [CRITIQUE] | Hub éducatif | `/learn/hub` | Index + reprise, progression, parcours recommandé |
| [HAUTE] | Comprendre | `/learn/comprendre` | KPI pédagogiques, ordres de grandeur |
| [HAUTE] | S'entraîner | `/learn/sentrainer` | Quiz SRS, répétition espacée |
| [MOYENNE] | Bonnes pratiques | `/learn/bonnes-pratiques` | Contenu terrain non opérationnel |
| [BASSE] | Ressources | `/learn/ressources` | Bibliothèque, liens externes |

---

## Points de dette

- Palette emerald/lime à remplacer par rose si déjà implémentée
- Routes `learn/*` hors `(app)/` — accès public ? Authz à vérifier
- Hub : vérifier si la dernière page consultée est persistée (localStorage/cookie)
- `quiz-srs.md` dans la doc : fonctionnalité planifiée ou implémentée ?

---

## À éviter

- UX de LMS lourde, cours longs et abstraits
- Séparation trop forte entre apprentissage et usage terrain
- Empilement de textes non actionnables
