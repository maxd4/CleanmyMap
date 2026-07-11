# Backlog d'audit GitHub

**Dernière revalidation documentaire :** 11 juillet 2026

Ce document distingue l'état confirmé, les éléments à revalider et les réglages hors dépôt.

## État courant confirmé dans le dépôt

### Dependabot

Le dernier état documenté indique :

```txt
0 alerte ouverte après remédiation locale et régénération du lockfile
```

Ce nombre doit être revalidé dans GitHub avant toute communication externe.

### Secret scanning

Le dernier état documenté indique :

```txt
0 alerte ouverte
```

L'audit local reste obligatoire :

```bash
npm run security:secrets
```

### Code scanning

Familles restant à revalider ou traiter si elles sont toujours présentes :

| Famille | Fichier historique | Priorité |
|---|---|---|
| `js/incomplete-sanitization` | `scripts/cleanup/run-inventory.js` | haute si flux externe |
| `js/file-access-to-http` | `apps/web/scripts/lib/sheet-ingestion-core.mjs` | haute si actif |
| `js/unused-local-variable` | plusieurs fichiers | faible |
| `js/unneeded-defensive-code` | `free-plan-services-visual.tsx` | faible |

Ne pas supposer qu'une ligne ou une alerte historique existe encore : revalider le code courant.

## CI

Correction attendue par le lot d'audit GPT-5.6 :

- audit de secrets également sur changements documentaires ;
- hygiène racine en CI ;
- gouvernance documentaire en CI ;
- détection de dérive de versions ;
- contrôle des skills miroir ;
- build de production pour les changements code ;
- typecheck dédié pour l'application compagnon lorsqu'elle change.

Fichier cible :

```txt
.github/workflows/ci.yml
```

## Branche `main`

État documenté :

```txt
main non protégée
```

Ce réglage est externe au dépôt.

Recommandation minimale :

- interdire le force-push ;
- exiger les checks critiques décidés ;
- garder un workflow compatible avec un mainteneur unique.

## Priorité

1. corriger les garanties CI qui donnent une fausse impression de couverture ;
2. revalider CodeQL sur le commit courant ;
3. traiter les flux d'entrée externes avant les notes de qualité ;
4. protéger `main` selon le niveau de friction accepté ;
5. nettoyer les alertes de note par petits lots.

## Règle de mise à jour

Pour chaque snapshot GitHub, enregistrer :

```txt
date
commit SHA
Dependabot open count
Code scanning open count
Secret scanning open count
branch protection state
```

Ne pas mélanger un état historique et un backlog actif sans statut explicite.
