# Session de Maintenance et Optimisation - Mai 2026

## Résumé des travaux effectués

Cette session a traité plusieurs sujets d'optimisation et de conformité pour CleanMyMap.

---

## 1. Performance - Parallélisation des appels API

### Problème
Les pages chargeaient les données de manière séquentielle, causant des temps de chargement inutilement longs.

### Solution
Regroupement des appels indépendants avec `Promise.all`.

### Pages modifiées
- `dashboard/page.tsx` - identity, role, displayMode en parallèle
- `explorer/page.tsx` - locale, displayModePreference, role en parallèle
- `reports/page.tsx` - session, locale, data, utils en parallèle
- `actions/new/page.tsx` - identity, role en parallèle
- `admin/page.tsx` - 5 appels DB en parallèle
- `observatoire/page.tsx` - overview + contracts
- `prints/report/page.tsx` - overview + contracts

### Gain attendu
- Admin: ~800ms → ~350ms
- Dashboard: ~600ms → ~250ms
- Reports: ~800ms → ~350ms

### Erreur à éviter
Toujours vérifier les dépendances entre données avant de paralléliser. Certaines données dépendent les unes des autres et doivent rester séquentielles.

---

## 2. Base de Données - Index

### Problème
Les requêtes filtrant sur certaines colonnes manquaient d'index, causant des scans de table.

### Solution
Ajout de nouveaux indexes via migration `20260501000022_performance_optimization_indexes.sql`.

### Index ajoutés
```sql
idx_profiles_role_label           -- Filtres par rôle admin/elu
idx_actions_status_date          -- Filtres status + date combinés
idx_actions_derived_geometry_kind -- Recherche par type géométrie
idx_spots_status_created_at      -- Filtres status + date
idx_messages_channel_type       -- Filtrage par type de channel chat
idx_community_events_future     -- Événements à venir
idx_progression_events_status_phase -- Leaderboard gamification
idx_newsletter_status           -- Filtres actif/inactif
```

### Amélioration complexité
- O(n) scan → O(log n) index pour les queries filtrées
- Gain ~20-100x selon le volume

### Erreur à éviter
Ne pas sur-indexer : chaque index ralentit les INSERT/UPDATE de ~1-5%. Prioriser les colonnes utilisées dans les WHERE et ORDER BY.

### Documentation
- `documentation/database/QUERY_INDEX_AUDIT.md` - Audit complet des indexes

---

## 3. Opérations Atomiques

### Problème
Les opérations multi-étapes (action + training example, modération + notification + audit) pouvaient laisser un état partiel en cas d'erreur.

### Solution
Ajout de fonctions SQL atomiques + error handling dans le code.

### Modifications
- `lib/actions/store.ts` - Try/catch avec logging pour training example
- Migration `20260501000023_atomic_operations.sql` - Fonctions SQL atomiques

### Pattern utilisé
```typescript
try {
  await secondaryOperation();
} catch (error) {
  console.error("Non-critical op failed, continuing...", { error });
}
```

Pour les opérations critiques, utiliser des transactions SQL.

### Documentation
- `documentation/database/ATOMIC_OPERATIONS_AUDIT.md` - Audit complet

---

## 4. Conformité RGPD

### Problèmes détectés
1. Pas de formulaire dédié RGPD - utilisateur devait rédiger un email
2. Pas de mention suppression compte dans le profil
3. Confirmation automatique manquante

### Solution
- Création formulaire RGPD (`rgpd-request-form.tsx`)
- Ajout section paramètres compte dans profil (`account-settings-section.tsx`)
- Bouton mailto pré-rempli avec type de demande
- Confirmation via réponse email de l'admin

### Fichiers créés/modifiés
- `components/sections/rubriques/rgpd-request-form.tsx` 🆕
- `components/account/account-settings-section.tsx` 🆕
- `components/sections/rubriques/legal-section.tsx` ✅
- `app/(app)/profil/[profile]/page.tsx` ✅

### Manière de faire
Pour les demandes RGPD, ne pas créer de système complexe si le volume est faible. Un formulaire qui ouvre le client mail avec pré-remplissage suffit et est plus fiable.

---

## 5. Cookies et Analytics

### Problème
- PostHog initialisé sans vérification de consentement
- Vercel Analytics chargé directement dans le layout sans consentement

### Solution
- Création composant `conditional-analytics.tsx` qui vérifie le consentement avant de charger Analytics/SpeedInsights
- Mise à jour `layout.tsx` pour utiliser le composant conditionnel

### Fichiers modifiés
- `components/ui/conditional-analytics.tsx` 🆕
- `app/layout.tsx` ✅

### Consentement géré
- Bannière cookies existante
- localStorage `cleanmymap_cookie_consent`
- PostHog, Vercel Analytics, SpeedInsights conditionnels
- Sentry remains actif (intérêt légitime sécurité)

---

## 6. Rate Limiting

### Problème
Aucune protection contre les abus ou surcharge API.

### Solution
Implémentation d'un système de rate limiting in-memory.

### Fichiers créés
```
lib/rate-limit/
├── index.ts
├── types.ts       -- Config limites
├── store.ts       -- Token bucket
├── utils.ts       -- Helpers IP, key
├── server.ts      -- API route helpers
└── api-wrapper.ts -- Wrappers
```

### Limites par route
| Type | Limite | Fenêtre |
|------|--------|---------|
| Auth | 10/min | 60s |
| AI | 20/min | 60s |
| Write | 10/min | 60s |
| API | 50/min | 60s |

### Routes protégées
- POST /api/actions (10/min)
- POST /api/newsletter/subscribe (5/min)

### Erreur à éviter
- Limites trop strictes cassent l'UX
- Limites trop permissives n'évitent pas les abus
- Stocker les limites en mémoire les perd au restart

### Documentation
- `documentation/backend/RATE_LIMITING.md`

---

## 7. Documents Juridiques

### Fichiers créés
```
documentation/legal/
├── README.md
├── conditions-generales-utilisation.md
├── politique-confidentialite.md
├── politique-cookies.md
└── charte-benevole.md
```

### Mentions légales mises à jour
- Éditrice du site (association loi 1901 en cours)
- Directeur de publication (Maxence Deroome)
- Hébergeur (Vercel Inc.)
- Dates de mise à jour

---

## Commandes utiles

### Appliquer les migrations Supabase
```bash
cd apps/web
npx supabase db push
```

### Vérifier TypeScript
```bash
cd apps/web
npx tsc --noEmit
```

---

## Recommandations pour le futur

### Avant d'ajouter une fonctionnalité

1. **Performance**
   - Identifier les appels API indépendants
   - Les grouper avec Promise.all
   - Ajouter des Suspense boundaries pour le streaming

2. **Base de données**
   - Vérifier les indexes sur les colonnes filtrées
   - Éviter les scans O(n) sur les grandes tables
   - Tester les requêtes avec EXPLAIN

3. **Sécurité**
   - Ajouter rate limiting sur les endpoints sensibles
   - Logger les comportements suspects
   - Prévoir les rollback pour les opérations critiques

4. **Conformité**
   - Vérifier le consentement avant tout tracking
   - Documenter les traitements de données
   - Prévoir un moyen d'exercer les droits RGPD

---

## Patterns à suivre

### Parallélisation
```typescript
// ✓ Bon - données indépendantes
const [data1, data2, data3] = await Promise.all([
  fetchData1(),
  fetchData2(),
  fetchData3(),
]);

// ✗ Mauvais - données dépendantes
const data1 = await fetchData1();
const data2 = await fetchData2(data1.id); // dépend de data1
```

### Error handling opérations non-critiques
```typescript
try {
  await sendNotification();
} catch (error) {
  console.error("Notification failed but continuing...", { error });
}
```

### Rate limiting sur API
```typescript
import { verifyRateLimit, createServerRateLimitResponse } from "@/lib/rate-limit/server";

export async function POST(request: Request) {
  const rateLimit = await verifyRateLimit({ limit: 10, window: 60 });
  const rateLimitResponse = createServerRateLimitResponse(rateLimit.allowed, rateLimit.retryAfter);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }
  // ... handler
}
```

---

## Fichiers modifiés cette session

| Catégorie | Fichiers |
|-----------|----------|
| Pages parallelisées | dashboard, explorer, reports, actions/new, admin, observatoire, prints/report |
| Rate limiting | lib/rate-limit/* (nouveau), api/actions/route.ts, api/newsletter/subscribe/route.ts |
| RGPD | rgpd-request-form.tsx, account-settings-section.tsx, legal-section.tsx |
| Analytics | conditional-analytics.tsx, layout.tsx |
| Base données | store.ts, migrations/*.sql |
| Docs | documentation/legal/*.md, documentation/backend/RATE_LIMITING.md, documentation/database/*.md |