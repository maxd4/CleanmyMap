---
trigger: always_on
---

# CleanMyMap — Règle de gouvernance Antigravity

Avant toute modification, tout agent ou sous-agent doit lire **explicitement et intégralement** :

1. le fichier racine `AGENTS.md` ;
2. les fichiers `AGENTS.md` scoped applicables au périmètre concerné (par exemple `apps/web/AGENTS.md`, `apps/mobile/AGENTS.md`, `scripts/AGENTS.md`, `apps/web/supabase/AGENTS.md`, `apps/web/src/app/api/AGENTS.md`, `documentation/AGENTS.md`, `e2e/AGENTS.md`, `maintenance/python/AGENTS.md`, `.github/AGENTS.md`) ;
3. tout nouveau `AGENTS.md` scoped découvert en cours de chantier dès qu'un sous-arbre supplémentaire est touché.

Ne jamais supposer que l'injection automatique des règles couvre l'intégralité de ces fichiers (les limites de taille ou de tokens peuvent tronquer le chargement automatique). Ne jamais inclure automatiquement le contenu complet des `AGENTS.md` dans cette règle.

Tout sous-agent lancé pour une tâche CleanMyMap hérite de cette obligation de lecture explicite avant d'éditer ou de valider.
