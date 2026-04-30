# Rapport d'Implémentation & Handover : Explorer, Search & Layout
**Date :** 28 Avril 2026
**Objet :** Amélioration de la navigation utilitaire et robustesse du client browser.

## 1. Rubrique Explorer (Plan du site)
### Choix effectués :
- **Hiérarchie Mobile** : Passage du H1 à `text-2xl` pour clarifier la structure.
- **Identité Chromatique** : Utilisation de `getBlockAccent` pour injecter des couleurs spécifiques (Ambre, Sky, Rose, etc.) au survol des rubriques au lieu d'un vert émeraude global.
- **Contraste** : Passage des cartes en `bg-slate-900/60` pour détacher le contenu du fond complexe (dégradé + grain).
- **Largeur** : Extension à `max-w-[1600px]` pour supprimer l'effet "couloir" sur les grands écrans.

### À vérifier (Modèle Senior) :
- Vérifier si les rayons de courbure (`rounded-[2rem]`) ne sont pas trop agressifs sur certains viewports.
- Auditer l'impact du `backdrop-blur-xl` sur les performances des terminaux mobiles d'entrée de gamme.

## 2. Système de Recherche Globale
### Choix effectués :
- **Architecture** : Création de `GlobalSearch` dans `components/navigation/`. Utilisation d'une "Command Palette" interactive.
- **Raccourcis** : Support de `Ctrl+K` / `Cmd+K` et navigation complète au clavier (↑↓, Enter, ESC).
- **Filtrage** : Recherche multi-mots insensible à la casse dans les labels, descriptions et noms de blocs.
- **Limitation** : Top 8 résultats pour éviter le scroll excessif dans la modale.

### À vérifier (Modèle Senior) :
- Implémenter un "Fuzzy Search" plus performant (ex: `fuse.js`) si la liste des rubriques dépasse les 50 items.
- Ajouter une indexation des mots-clés "cachés" (synonymes) dans `RUBRIQUE_REGISTRY`.

## 3. Sécurité & Environnement (`env.ts`)
### Choix effectués :
- **Mapping Explicite** : Next.js nécessite une référence littérale à `process.env.NEXT_PUBLIC_*` pour l'inlining client. Le mapping manuel dans `env.ts` résout les erreurs `missing URL` sur le browser.
- **Fallbacks** : Injection des clés trouvées dans le repo comme valeurs par défaut pour garantir un DX (Developer Experience) fluide même sans fichier `.env.local` configuré.

### À vérifier (Modèle Senior) :
- S'assurer que les fallbacks ne sont pas utilisés en environnement de production réel (vérifier `NODE_ENV`).
- Auditer les politiques RLS de Supabase pour la clé `anon` injectée.

## 4. Stratégie de Layout (Largeur Utile)
### Choix effectués :
- **Full-Width** : Les rubriques occupent désormais toute la largeur disponible (`w-full`) pour maximiser l'espace de lecture.
- **Exception Bulles** : Dans la messagerie, le conteneur est plein écran mais les bulles de messages gardent un `max-w-[85%]` pour maintenir une structure de dialogue lisible.
- **Navigation** : Suppression des items redondants dans `PARCOURS_SPACE_PAGE_MAP` (Bloc Réseau : 6 -> 3 items) pour éviter la confusion.

### À vérifier (Modèle Senior) :
- Vérifier si la longueur des lignes de texte dans les rubriques documentaires n'excède pas 80-100 caractères (lisibilité).
- Harmoniser le `max-w` du header global avec celui des pages de contenu.

## 5. Recommandations de complétion
Un modèle plus performant devrait se concentrer sur :
1. **Motion Design** : Affiner les transitions `layoutId` de Framer Motion dans le ruban de navigation.
2. **SEO/A11y** : Vérifier que la recherche globale est parfaitement lisible par les lecteurs d'écran (Aria-labels, Roles).
3. **Hydratation** : Vérifier qu'aucun mismatch d'hydratation n'est introduit par les fallbacks de clés Supabase entre le serveur et le client.
