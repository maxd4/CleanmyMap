# Archive Technique : Tableau de Bord des Intégrations (Monitoring)

*Ce document sert de rappel pour les outils de supervision à implémenter ou à réactiver pour le développement du site.*

L'interface de monitoring "État des intégrations" a été retirée de l'interface utilisateur pour simplifier l'UX, mais la logique reste disponible dans le code pour référence technique.

## 1. Services à surveiller
L'infrastructure CleanMyMap repose sur les intégrations suivantes :

- **Supabase** (Base de données & Auth Storage)
- **Vercel** (Hosting & Edge Runtime)
- **Clerk** (Authentification Utilisateur)
- **Cloudflare** (DNS, Security, CDN)
- **Sentry** (Error tracking & Performance)

## 2. Endpoints de Supervision (Reference)
Le système prévoyait les endpoints suivants pour le "Health Check" :
- `/api/uptime` : Statut général du serveur et latence.
- `/api/services` : État individuel de chaque fournisseur tiers.

## 3. Composant Historique
Le composant React `SystemStatusPanel` (situé dans `apps/web/src/components/dashboard/system-status-panel.tsx`) contient le code UI de ce tableau. Il peut être utilisé comme base pour créer un futur dashboard admin dédié à la maintenance.

## 4. Prochaines étapes suggérées
- Implémenter des vérifications réelles via les APIs de statut de ces services (ex: StatusPage APIs).
- Créer une alerte automatique (Slack/Discord) en cas de dégradation détectée par ces endpoints.
