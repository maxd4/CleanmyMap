# Résumé - Système de Curseurs

## Date: 2026-04-25

---

## Fichiers modifiés

### 1. CSS Global
**`apps/web/src/app/globals.css`**
- Ajout section complète "CURSOR SYSTEM" (lignes 139-259)
- Règles natives pour tous les éléments interactifs
- Classes utilitaires `.cursor-*`
- Classes canoniques `.cmm-interactive`, `.cmm-clickable`, `.cmm-input`

### 2. Composants modifiés

| Fichier | Modification |
|---------|-------------|
| `components/ui/cmm-button.tsx` | Classe `cmm-interactive` + `cursor-not-allowed` sur disabled |
| `components/ui/cmm-card.tsx` | Props `clickable`, `onClick`, `disabled` avec classe `cmm-clickable` |

---

## Comportements implémentés

| Élément | Curseur | Méthode |
|---------|---------|---------|
| Boutons actifs | pointer | CSS natif |
| Liens `[href]` | pointer | CSS natif |
| Inputs texte | text | CSS natif |
| Selects | pointer | CSS natif |
| Checkboxes/Radios | pointer | CSS natif |
| Éléments disabled | not-allowed | CSS natif |
| Cards cliquables | pointer | Classe `cmm-clickable` |
| Cards désactivées | not-allowed | Prop `disabled` |
| Éléments draggables | grab/grabbing | Classes `.cursor-grab/grabbing` |

---

## Nouvelles fonctionnalités

### CmmCard cliquable
```tsx
<CmmCard 
  clickable 
  onClick={() => router.push('/path')}
  disabled={isLoading}
>
  Contenu
</CmmCard>
```

### Classes utilitaires
```tsx
<div className="cursor-grab" draggable>
<div className="cursor-help">Aide</div>
<span className="cursor-inherit">Hérite du parent</span>
```

---

## Documentation complète
Voir: `documentation/design/cursor-system.md`
