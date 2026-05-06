# Plan de Modularisation : ChatShell

**Fichier Cible** : `apps/web/src/components/chat/chat-shell.tsx`
**Taille Actuelle** : ~1051 lignes, 41 KB
**Objectif** : Fichier principal < 200 lignes. Séparation claire UI / Logique métier.

Ce plan doit être exécuté séquentiellement. Validez chaque phase avec `npm run typecheck` et `npm run lint` avant de passer à la suivante.

---

## Phase 1 : Extraction des hooks métier (State & Fetching)

Actuellement, `chat-shell.tsx` contient une énorme quantité de `useState`, `useRef`, et `useSWR` directement dans le composant.

**Instructions pour l'agent** :
```markdown
1. Crée le fichier `apps/web/src/components/chat/hooks/use-chat-state.ts`.
2. Déplace toute la logique d'état local (channels, currentChannel, message, file, recipientQuery, etc.) dans un custom hook `useChatState`.
3. Crée le fichier `apps/web/src/components/chat/hooks/use-chat-data.ts`.
4. Déplace toute la logique de fetching SWR (les requêtes `/api/chat/channels`, les mutations, la logique WebSocket si présente) dans ce custom hook.
5. Mets à jour `chat-shell.tsx` pour importer et utiliser ces hooks.
6. Assure-toi que les imports manquants (SWR, React, types) sont bien ajoutés dans les nouveaux fichiers.
```
**Validation Phase 1** : Le fichier `chat-shell.tsx` ne doit plus contenir de `useSWR` direct ni de longue liste de `useState`. L'application compile.

---

## Phase 2 : Extraction des composants UI de bas niveau

Certains composants visuels purs encombrent le fichier, comme `ChannelButton` ou la logique de rendu d'un message individuel.

**Instructions pour l'agent** :
```markdown
1. Crée le dossier `apps/web/src/components/chat/ui/`.
2. Extrais le composant `ChannelButton` (lignes 969-1051 environ) dans un nouveau fichier `ui/channel-button.tsx`.
3. Identifie le bloc de code (gros `if/else`) qui fait le rendu d'un message dans la liste (image, bug report, texte).
4. Crée un fichier `ui/chat-message-item.tsx` et déplaces-y ce bloc de code. Il devra prendre en props le `message`, le `userId` actuel (pour savoir si c'est "moi" ou un autre), etc.
5. Remplace le code dans `chat-shell.tsx` par l'appel à `<ChatMessageItem />`.
```
**Validation Phase 2** : `ChannelButton` est supprimé de la fin de `chat-shell.tsx`. Le map des messages est propre.

---

## Phase 3 : Extraction des sections principales de l'interface

Le rendu global contient 3 gros morceaux : la barre latérale (Sidebar), l'en-tête (Header) et la zone de saisie (Composer).

**Instructions pour l'agent** :
```markdown
1. Crée le composant `apps/web/src/components/chat/chat-sidebar.tsx`. Il doit recevoir en props les listes de `channels`, la `currentChannel`, et la fonction de sélection.
2. Crée le composant `apps/web/src/components/chat/chat-header.tsx`. Il gérera le titre du canal actif et les boutons d'action (comme l'appel vidéo ou la recherche).
3. Crée le composant `apps/web/src/components/chat/chat-composer.tsx`. Il contiendra le formulaire de saisie (`<form>`), la gestion des pièces jointes, la zone d'auto-complétion des mentions et le bouton `Send`.
4. Intègre ces trois composants dans `chat-shell.tsx`.
```
**Validation Phase 3** : Le `return` de `ChatShell` doit maintenant ressembler à une structure de layout très claire, de type :
`<div className="flex..."><ChatSidebar /><div className="flex-1"><ChatHeader /><MessageList /><ChatComposer /></div></div>`. 

---

## Phase 4 : Améliorations Kaizen (Logique Métier & Performance)

Une fois la modularisation terminée, le code est propre mais l'architecture applicative peut être améliorée.

**Instructions pour l'agent (Analyse & Suggestions)** :
```markdown
1. Ouvre le fichier `TEMPLATE-AUDIT.md` situé dans `documentation/kaizen-implementation-plan/`.
2. Remplis mentalement ou dans un rapport l'audit pour la feature Chat.
3. Implémente les optimisations métier suivantes (Kaizen) :
   - **Performance** : La gestion des messages dans `use-chat-data.ts` utilise-t-elle correctement le cache SWR (`mutate`) lors de l'envoi d'un message, pour un rendu optimiste (Optimistic UI) sans attendre le retour serveur ? Si non, implémente-le.
   - **UX / Accessibilité** : Dans `chat-composer.tsx`, ajoute une gestion propre de l'envoi via la touche `Entrée` (sans shift) et empêche le spam de clic sur le bouton envoyer (debounce ou disable state clair).
   - **Gestion d'erreur** : Si l'upload d'un fichier échoue (dans le composer), l'utilisateur doit voir un toast d'erreur explicite, plutôt qu'une simple alerte ou un échec silencieux.
4. Maintiens le mode mixte (ni clair, ni sombre, couleurs douces) et les tokens couleurs du projet.
```

## Résultat Attendu
À la fin de ce plan, le composant monolithique de plus de 1000 lignes sera devenu un orchestrateur de moins de 200 lignes, hautement maintenable et testable, avec une UX améliorée.
