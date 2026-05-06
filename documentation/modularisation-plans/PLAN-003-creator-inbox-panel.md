# Plan de Modularisation : CreatorInboxPanel

**Fichier Cible** : `apps/web/src/components/admin/creator-inbox-panel.tsx`
**Taille Actuelle** : ~696 lignes, 28 KB
**Objectif** : Fichier principal < 150 lignes. Séparation claire UI / Logique métier.

Ce plan doit être exécuté séquentiellement. Validez chaque phase avec `npm run typecheck` et `npm run lint` avant de passer à la suivante.

---

## Phase 1 : Constantes et Utilitaires

Le fichier contient des filtres statiques et une fonction utilitaire de mise à jour de liste (`refreshList`).

**Instructions pour l'agent** :
```markdown
1. Crée le dossier `apps/web/src/components/admin/creator-inbox/`.
2. Crée le fichier `inbox-constants.ts`.
3. Déplaces-y `SOURCE_FILTERS`, `STATUS_FILTERS` et la fonction `refreshList`.
4. Exporte-les et adapte les imports dans le fichier d'origine.
```
**Validation Phase 1** : Les constantes et `refreshList` sont extraits. L'application compile.

---

## Phase 2 : Extraction de l'Orchestration d'API (Hook)

Toute la logique d'état (filtres, requêtes, messages de succès/erreur, chargement) et les appels d'API (`fetch`) encombrent le rendu du composant.

**Instructions pour l'agent** :
```markdown
1. Crée le fichier `apps/web/src/components/admin/creator-inbox/use-creator-inbox.ts`.
2. Déplaces-y tous les `useState` et les `useMemo` (`summary`, `filteredItems`).
3. Déplaces-y toutes les fonctions asynchrones : `refreshInbox`, `applyInboxAction`, `acceptPromotion`, `rejectPromotion`, `acceptPartner`, `rejectPartner`, `copySummary`.
4. Crée la fonction utilitaire interne `actionBusy` dans ce hook.
5. Retourne un objet propre contenant l'état (données, filtres, messages) et les actions (les fonctions).
6. Intègre `useCreatorInbox` dans le composant `CreatorInboxPanel`.
```
**Validation Phase 2** : `creator-inbox-panel.tsx` ne contient plus de logique `fetch` ni de `useState`.

---

## Phase 3 : Extraction des sections UI

Le rendu est un monolithe contenant l'en-tête, la barre de filtres, et surtout la carte d'un item (`inbox-item-card`) qui possède une logique complexe de boutons d'action.

**Instructions pour l'agent** :
```markdown
1. Crée le fichier `apps/web/src/components/admin/creator-inbox/inbox-header.tsx` pour l'en-tête (titres et compteurs).
2. Crée le fichier `apps/web/src/components/admin/creator-inbox/inbox-filter-bar.tsx` pour la barre de recherche et les `<select>`.
3. Crée le fichier `apps/web/src/components/admin/creator-inbox/inbox-item-card.tsx`.
   - Déplaces-y tout le JSX correspondant à `<article key={item.id} ...>`.
   - Ce composant doit recevoir en props `item` et les callbacks d'actions (issus du hook).
4. Remplace tout le bloc JSX de `creator-inbox-panel.tsx` par l'assemblage de ces 3 composants, en mappant sur `filteredItems` avec `InboxItemCard`.
```
**Validation Phase 3** : Le `return` de `CreatorInboxPanel` devient ultra simple : un Layout appelant `Header`, `FilterBar`, puis un `.map` rendant `InboxItemCard`. Fichier < 150 lignes.

---

## Phase 4 : Améliorations Kaizen (Logique Métier & Architecture)

Maintenant que la vue est propre, la logique métier montre plusieurs faiblesses techniques.

**Instructions pour l'agent (Analyse & Suggestions)** :
```markdown
1. Ouvre le fichier `TEMPLATE-AUDIT.md` (dans `documentation/kaizen-implementation-plan/`).
2. Remplis l'audit mentalement pour l'Inbox Créateur.
3. Implémente les optimisations métier suivantes (Kaizen) :
   - **Service Layer** : Les appels `fetch` directs dans le hook sont difficiles à tester. Propose/Crée un fichier `creator-inbox-service.ts` qui encapsulera les requêtes vers `/api/admin/*`. Le hook `useCreatorInbox` ne fera qu'appeler ce service.
   - **Internationalisation (i18n)** : Actuellement gérée avec des `fr ? "texte" : "text"` partout. Suggère ou implémente un dictionnaire local pour nettoyer le code (ex: `translations[locale].accept`), ou utilise le système i18n global s'il y en a un.
   - **UX / Feedback** : Le texte de confirmation "CONFIRMER PARTENAIRE" est codé en dur et case-sensitive (via `.toUpperCase()`). Rends cette logique plus résiliente, ou utilise un composant de confirmation standard (ex: Dialog/Modal) avec validation Zod.
4. Maintiens les tokens Tailwind (slate, emerald, rose) et le style global de l'interface.
```

## Résultat Attendu
Le dashboard d'administration gagne en lisibilité avec une séparation très nette `Service API -> Hook -> Composant UI -> Sous-composant`.
