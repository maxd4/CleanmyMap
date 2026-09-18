## Annexe A — Dépendances technologiques et scénarios de rupture {#annexe-a-dependances-technologiques-et-scenarios-de-rupture}

### A.1 Lecture géopolitique des dépendances

La majorité des services critiques ou structurants sont liés à des entreprises américaines ou à des infrastructures fortement intégrées au cloud américain : Vercel, GitHub/Microsoft, Google, Stripe, Sentry, PostHog selon hébergement, Pinecone, OpenAI, Upstash selon régions, npm et potentiellement Cloudflare.

Enjeux principaux :

- **souveraineté des données** : données d'utilisateurs, actions, photos, coordonnées, messages, mesure d'audience et logs peuvent dépendre de juridictions et sous-traitants hors contrôle local ;
- **extraterritorialité juridique** : selon fournisseurs, région d'hébergement et contrat, des règles non européennes peuvent s'appliquer ou créer une incertitude ;
- **pouvoir de plateforme** : changement de prix, quotas, restrictions, fermeture de compte ou modification d'API peut affecter le projet sans décision locale ;
- **concentration du savoir-faire** : le projet devient plus facile à maintenir pour des développeurs habitués à ces plateformes, mais moins autonome pour une association locale ;
- **dépendance IA fermée** : si l'IA devient centrale, le projet dépend de modèles opaques, coûteux, peu auditables et soumis à des politiques d'accès externes.

Le risque n'est pas que ces services soient mauvais par nature.
Le risque est qu'une infrastructure à finalité écologique locale dépende d'une pile mondiale centralisée dont les intérêts, coûts et règles peuvent diverger des besoins locaux.

### A.2 Scénarios de rupture

| Scénario de rupture    | Effet immédiat                                             |                        Gravité |      Probabilité | Commentaire                                    |
| ---------------------- | ---------------------------------------------------------- | -----------------------------: | ---------------: | ---------------------------------------------- |
| Supabase indisponible  | carte, déclarations, profils, rapports et stockage touchés |                       critique |          moyenne | point de défaillance central                   |
| Clerk indisponible     | connexion, droits, admin, profil, espaces privés bloqués   |                       critique |          moyenne | la partie publique peut survivre partiellement |
| Vercel indisponible    | site et API indisponibles si pas de déploiement alternatif |                       critique | faible à moyenne | dépend aussi DNS/CDN                           |
| Google Sheets coupé    | import/export opérationnel perturbé                        |                          moyen |          moyenne | grave seulement si source de vérité            |
| Resend coupé           | e-mails et notifications sortantes stoppés                 |                          moyen |          moyenne | contournable manuellement                      |
| Stripe coupé           | paiement/dons/sponsor affectés                             |                          moyen | faible à moyenne | pas coeur terrain                              |
| PostHog/Sentry coupés  | perte de mesure et observabilité                           |                 faible à moyen |          moyenne | ne devrait pas bloquer l'usage                 |
| Upstash/QStash coupé   | files/cache/tâches async affectées                         |                          moyen |          moyenne | dépend du niveau d'usage réel                  |
| Pinecone/OpenAI coupés | fonctions IA/vectorielles indisponibles                    | faible actuel, fort si central |          moyenne | doit rester optionnel                          |
| npm/GitHub coupés      | maintenance, CI et déploiement perturbés                   |            fort pour évolution | faible à moyenne | n'empêche pas forcément le site déjà en ligne  |

Le projet pourrait continuer partiellement sans certains services : pages statiques, documentation, méthodologie et contenus publics peuvent survivre avec un export statique ; des données déjà exportées en CSV/JSON peuvent rester exploitables ; une carte simple peut fonctionner avec données statiques et tuiles ouvertes ; des rapports simples peuvent être générés hors ligne si les données sont exportées.

Le projet cesserait immédiatement ou fortement de fonctionner sans Supabase pour les données dynamiques et le stockage, sans Clerk pour l'authentification et les rôles, ou sans Vercel ou équivalent pour le runtime web/API.

### A.3 Cartographie détaillée des dépendances

| Dépendance     | Rôle dans le projet     | Type                                                     | Criticité   | Remplaçabilité      |
| -------------- | ----------------------- | -------------------------------------------------------- | ----------- | ------------------- |
| Vercel         | hébergement, runtime    | plateforme cloud                                         | critique    | moyenne à difficile |
| Supabase       | base Postgres, Storage  | BaaS/Postgres managé                                     | critique    | moyenne             |
| Clerk          | authentification        | auth propriétaire                                        | critique    | difficile           |
| Resend         | e-mails transactionnels | logiciel en tant que service e-mail                      | raisonnable | facile à moyenne    |
| Stripe         | paiements               | paiement propriétaire                                    | raisonnable | moyenne             |
| PostHog        | mesure d'audience       | mesure d'audience logiciel en tant que service/open-core | raisonnable | moyenne             |
| Sentry         | observabilité           | logiciel en tant que service/open-source                 | raisonnable | moyenne             |
| Upstash/QStash | cache, files, tâches    | serverless data/queue                                    | raisonnable | moyenne             |
| Pinecone       | recherche vectorielle   | base vectorielle                                         | optionnelle | moyenne à difficile |
| OpenAI         | IA sémantique           | modèle IA fermé                                          | optionnelle | moyenne à difficile |
