# Gouvernance locale — `e2e`

Ce fichier hérite de `AGENTS.md`. `documentation/development/TESTING.md` reste
la source de vérité des procédures, commandes et contrats E2E.

- Classer chaque parcours selon sa surface : `PUBLIC`,
  `PROTECTED_SERVER_ONLY` ou `PROTECTED_CLERK_CLIENT`.
- Pour les parcours navigateur authentifiés Clerk, utiliser Clerk Development
  et les projets, fixtures et setup/teardown Playwright existants.
- Aucune Supabase locale mutable persistante hors de la lane CI éphémère
  prévue ; les campagnes persistantes utilisent uniquement cette lane.
- Ne jamais publier de `storageState`, cookies, tokens, traces/HAR ou vidéos
  contenant des données sensibles.
- Respecter les projets Playwright et les fixtures existants ; ne pas créer une
  seconde matrice ni une seconde procédure E2E.
