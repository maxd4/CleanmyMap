# Guide de Modularisation — Agents IA

> **Version :** 4.0.0 | **Mis à jour :** 2026-05-06  
> **Référence plan :** `documentation/architecture/monolith-split-plan.md`

---

## 1. Quand modulariser ?

| Signal | Action |
|--------|--------|
| Fichier > 500 lignes **OU** > 20 KB | Modulariser (priorité haute) |
| Fichier > 300 lignes **OU** > 12 KB | Évaluer pour modularisation |
| Plusieurs responsabilités distinctes dans un même fichier | Modulariser |
| Code difficile à tester unitairement | Extraire dans un hook/helper |
| Copié-collé entre 2 composants | Extraire en composant réutilisable |
| `page.tsx` fait du fetch ET du rendu complexe | Séparer Server Component / Client Component |

**Tailles cibles pragmatiques :**

| Type | Lignes max | Taille max | Notes |
|------|-----------|------------|-------|
| `page.tsx` (Server Component) | 150 | 6 KB | Peut aller jusqu'à 200 lignes si simple orchestration |
| Composant orchestrateur | 300 | 12 KB | Acceptable si bien structuré avec sections claires |
| Composant complexe | 400 | 15 KB | Limite absolue, au-delà = modulariser |
| Composant simple / UI | 200 | 8 KB | Peut contenir plusieurs variantes |
| Hook | 250 | 10 KB | Acceptable si logique cohérente |
| Config / données statiques | 200 / fichier | 12 KB | Diviser par catégorie si > 15 KB |
| Utils / helpers | 200 | 8 KB | Regrouper par domaine fonctionnel |

**Principe directeur :** Privilégier la **cohésion fonctionnelle** sur la taille brute. Un fichier de 350 lignes bien organisé avec une seule responsabilité claire est préférable à 5 fichiers de 70 lignes avec des dépendances croisées.

---

## 2. Processus en 5 étapes

```
ANALYSER → PLANIFIER → EXTRAIRE → INTÉGRER → VALIDER
```

### ÉTAPE 1 — ANALYSER (5 min)

Lire le fichier en entier, identifier :

- Les responsabilités distinctes (UI, logique, config, types, fetching).
- Les blocs de > 50 lignes pouvant vivre dans leur propre fichier.
- Les dépendances (imports extérieurs, hooks, props).

**Output attendu :**
```
Fichier : apps/web/src/components/chat/chat-shell.tsx
Taille  : 41 801 o (~650 lignes) — CRITIQUE
Responsabilités identifiées :
  1. Gestion connexion WebSocket (logique)
  2. Fetch + pagination des messages (logique)
  3. Rendu liste de messages (UI)
  4. Zone de saisie + send (UI)
  5. Gestion pièces jointes (UI + logique)
  6. En-tête du chat (UI)
```

### ÉTAPE 2 — PLANIFIER (5 min)

Définir la structure cible **avant** d'écrire une ligne de code.

**Template de structure :**
```
feature/
├── index.ts                 ← re-exports centralisés (obligatoire)
├── feature-main.tsx         ← orchestrateur (< 150 lignes)
├── feature-section-a.tsx    ← sous-composant A
├── feature-section-b.tsx    ← sous-composant B
├── use-feature-logic.ts     ← logique / état
├── feature.config.ts        ← données statiques / constantes
└── feature.types.ts         ← interfaces TypeScript
```

### ÉTAPE 3 — EXTRAIRE (20–40 min)

Ordre d'extraction recommandé :

1. **Types** (`types.ts`) — interfaces, enums, DTOs.
2. **Config / données** (`config.ts`) — constantes, tableaux statiques.
3. **Helpers purs** (`helpers.ts`) — fonctions sans effet de bord.
4. **Hooks** (`use-*.ts`) — `useState`, `useEffect`, appels API.
5. **Sous-composants** (`*.tsx`) — sections visuelles distinctes.
6. **Index** (`index.ts`) — re-exports propres.

**Patterns par type d'extraction :**

#### A. Extraire des types

```typescript
// feature/feature.types.ts
export interface FeatureItem {
  id: string;
  name: string;
  value: number;
}

export type FeatureStatus = 'idle' | 'loading' | 'error' | 'success';
```

#### B. Extraire la configuration

```typescript
// feature/feature.config.ts
import type { FeatureItem } from './feature.types';

export const FEATURE_ITEMS: FeatureItem[] = [
  { id: '1', name: 'Item A', value: 100 },
];

export function buildFeatureData(raw: unknown[]): FeatureItem[] {
  // transformation pure — aucun effet de bord
  return raw.map(/* ... */);
}
```

#### C. Extraire un hook

```typescript
// feature/use-feature-data.ts
import { useState, useEffect } from 'react';
import type { FeatureItem, FeatureStatus } from './feature.types';

export function useFeatureData() {
  const [items, setItems] = useState<FeatureItem[]>([]);
  const [status, setStatus] = useState<FeatureStatus>('idle');

  useEffect(() => {
    setStatus('loading');
    fetch('/api/feature')
      .then(r => r.json())
      .then(data => { setItems(data); setStatus('success'); })
      .catch(() => setStatus('error'));
  }, []);

  return { items, status };
}
```

#### D. Extraire un sous-composant

```typescript
// feature/feature-card.tsx
import type { FeatureItem } from './feature.types';

interface FeatureCardProps {
  item: FeatureItem;
  onClick?: (id: string) => void;
}

export function FeatureCard({ item, onClick }: FeatureCardProps) {
  return (
    <div className="cmm-card" onClick={() => onClick?.(item.id)}>
      <h3 className="cmm-text-h3">{item.name}</h3>
    </div>
  );
}
```

#### E. Créer l'index

```typescript
// feature/index.ts
export { FeatureMain } from './feature-main';
export { FeatureCard } from './feature-card';
export { useFeatureData } from './use-feature-data';
export type { FeatureItem, FeatureStatus } from './feature.types';
```

### ÉTAPE 4 — INTÉGRER (10 min)

Mettre à jour le fichier original pour qu'il devienne un orchestrateur léger :

```typescript
// AVANT — 650 lignes, tout en un
import { Icon1, Icon2 } from 'lucide-react';
function ChatShell() {
  const [messages, setMessages] = useState([]);
  // 600 lignes de logique + JSX mélangés
}

// APRÈS — < 150 lignes, rôle d'assemblage
import { ChatHeader, ChatMessageList, ChatInputBar } from './index';
import { useChatMessages } from './use-chat-messages';
import { useChatConnection } from './use-chat-connection';

export function ChatShell({ sessionId }: ChatShellProps) {
  const { messages, sendMessage } = useChatMessages(sessionId);
  const { status } = useChatConnection(sessionId);

  return (
    <div className="flex flex-col h-full">
      <ChatHeader status={status} />
      <ChatMessageList messages={messages} />
      <ChatInputBar onSend={sendMessage} />
    </div>
  );
}
```

### ÉTAPE 5 — VALIDER (5 min)

```bash
npm -C apps/web run lint        # 0 erreur, 0 warning
npm -C apps/web run test        # tests existants + nouveaux hooks
npm run typecheck               # 0 erreur TypeScript
npm run quality:top-heavy       # fichier retiré du top 20
```

---

## 3. Règles strictes

### ✅ Toujours faire

1. **Définir les types en premier** — interfaces avant le code.
2. **Créer `index.ts`** pour chaque nouveau dossier de feature (optionnel pour petites features < 3 fichiers).
3. **Extraire la configuration avant les composants** — données séparées du rendu.
4. **Ne pas modifier la signature publique** — props, hook returns, exports nommés inchangés.
5. **Tester les fonctions pures** — helpers et hooks avant de supprimer l'original.
6. **Valider après chaque extraction majeure** — `lint` + `typecheck` après chaque phase, pas nécessairement après chaque fichier.

### ❌ Ne jamais faire

1. **Sur-modulariser** — un fichier par ligne est contre-productif. **Règle des 3 usages** : n'extraire un composant que s'il est réutilisé 3+ fois OU s'il dépasse 150 lignes.
2. **Créer des dépendances circulaires** — architecture unidirectionnelle obligatoire.
3. **Utiliser des noms génériques** — `Card`, `Item`, `Component` sont interdits. Préférer `ActionMapPopup`, `HarvestPhotoCard`.
4. **Copier-coller** sans extraire dans un composant partagé (sauf si < 10 lignes et contexte très différent).
5. **Supprimer le code legacy** avant que les tests soient verts.
6. **Modulariser prématurément** — attendre qu'un fichier atteigne 400+ lignes ou montre des signes clairs de responsabilités multiples.

### 🎯 Critères de décision : Extraire ou pas ?

**EXTRAIRE si :**
- Le bloc fait > 100 lignes ET a une responsabilité distincte
- Le code est réutilisé 3+ fois
- Le fichier parent dépasse 500 lignes
- Le bloc est difficile à tester dans son contexte actuel

**NE PAS EXTRAIRE si :**
- Le bloc fait < 50 lignes
- Il est fortement couplé au composant parent (utilise 5+ props/states du parent)
- L'extraction créerait plus de complexité (prop drilling, context nécessaire)
- Le fichier parent reste < 300 lignes après nettoyage

---

## 4. Patterns communs dans CleanMyMap

### Pattern A — Page Next.js monolithique → Server + Client

```
app/(app)/feature/
├── page.tsx           ← Server Component : fetch data, passe props, < 80 lignes
└── feature-client.tsx ← Client Component : interactivité, < 200 lignes

components/feature/    ← sous-composants partagés
```

### Pattern B — Section rubrique (pattern dominant dans ce projet)

```
components/sections/rubriques/[nom]/
├── index.ts
├── [nom]-section.tsx           ← conteneur léger (< 150 lignes)
├── [nom]-header.tsx
├── [nom]-content.tsx
├── [nom]-empty-state.tsx
├── use-[nom]-data.ts           ← SWR / fetch + normalisation
└── use-[nom]-kpis.ts           ← calculs, tris, filtres
```

### Pattern C — Hook monolithique → hooks spécialisés

```
hooks/feature/
├── use-feature.ts              ← orchestrateur, réexporte tout
├── use-feature-state.ts        ← useState + fonctions reset
├── use-feature-actions.ts      ← handlers (onClick, onSubmit...)
└── use-feature-data.ts         ← fetch + cache
```

### Pattern D — Données statiques volumineuses

```
data/[domaine]/
├── [catégorie-a].ts
├── [catégorie-b].ts
└── index.ts                    ← combinaison + re-export
```

---

## 5. Prompt template pour une IA

```
Je vais modulariser le fichier [CHEMIN] suivant le guide AI_MODULARIZATION_GUIDE.md.

ÉTAPE 1 — ANALYSE
- Taille : [X] o / [Y] lignes
- Responsabilités identifiées : [liste numérotée]
- Dépendances : [imports principaux]

ÉTAPE 2 — STRUCTURE CIBLE
[arborescence des nouveaux fichiers]

ÉTAPE 3-4 — EXÉCUTION
Je vais créer les fichiers dans l'ordre : types → config → hooks → sous-composants → index → refactoring de l'original.

ÉTAPE 5 — VALIDATION
npm -C apps/web run lint && npm run typecheck && npm run quality:top-heavy

Résultat attendu : [AVANT X] o → [APRÈS Y] o (objectif -60%)
```

---

## 6. Ressources

| Fichier | Rôle | Lire avant... |
|---------|------|---------------|
| `documentation/architecture/monolith-split-plan.md` | Liste des fichiers prioritaires | Toute modularisation |
| `documentation/design-system/TYPOGRAPHY_SYSTEM.md` | Classes `cmm-text-*` | Tout composant textuel |
| `documentation/design-system/display-modes-chartes.md` | Mode sobre, fallbacks | Tout composant animé |
| `apps/web/src/components/ui/cmm-button.tsx` | Props CmmButton | Tout prompt avec boutons |
| `apps/web/src/components/ui/cmm-card.tsx` | Props CmmCard | Tout prompt avec cards |
| `apps/web/tailwind.config.ts` | Palette, tokens, breakpoints | Tout doute sur une couleur |
