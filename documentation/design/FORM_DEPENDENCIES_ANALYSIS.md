# 🔍 ANALYSE DÉTAILLÉE - Dépendances Formulaire

**Complément à:** `FORM_AUDIT_REPORT.md`  
**Objectif:** Analyser les dépendances techniques avant simplification  

---

## 📊 Analyse des champs par usage

### Champs CRITIQUES (ne pas supprimer)
| Champ | Usage Backend | Usage Frontend | Usage Analytics | Risque |
|-------|---------------|----------------|-----------------|--------|
| `wasteKg` | ✅ Calculs impact | ✅ Affichage cartes | ✅ Métriques KPI | 🔴 ÉLEVÉ |
| `volunteersCount` | ✅ Calculs impact | ✅ Affichage cartes | ✅ Métriques KPI | 🔴 ÉLEVÉ |
| `actionDate` | ✅ Tri temporel | ✅ Filtres | ✅ Rapports | 🔴 ÉLEVÉ |
| `locationLabel` | ✅ Géolocalisation | ✅ Recherche | ✅ Zones | 🔴 ÉLEVÉ |
| `actorName` | ✅ Attribution | ✅ Profils | ✅ Engagement | 🟡 MOYEN |
| `associationName` | ✅ Rapports RSE | ✅ Filtres | ✅ Partenaires | 🟡 MOYEN |

### Champs TECHNIQUES (automatisables)
| Champ | Automatisation possible | Impact suppression |
|-------|------------------------|-------------------|
| `latitude/longitude` | ✅ GPS + Géocodage | 🟢 FAIBLE - Auto-généré |
| `cigaretteButts` | ✅ Calcul depuis `wasteMegotsKg` | 🟢 FAIBLE - Redondant |
| `durationMinutes` | ✅ Estimation ML | 🟡 MOYEN - Utilisé rapports |
| `placeType` | ✅ Détection auto lieu | 🟡 MOYEN - Catégorisation |

### Champs OPTIONNELS (supprimables)
| Champ | Usage actuel | Fréquence remplissage | Impact suppression |
|-------|--------------|----------------------|-------------------|
| `routeAdjustmentMessage` | Aucun | < 5% | 🟢 FAIBLE |
| `visionBagsCount` | IA training | < 10% | 🟢 FAIBLE |
| `visionFillLevel` | IA training | < 10% | 🟢 FAIBLE |
| `visionDensity` | IA training | < 10% | 🟢 FAIBLE |
| `wastePlastiqueKg` | Rapports détaillés | < 15% | 🟡 MOYEN |
| `wasteVerreKg` | Rapports détaillés | < 15% | 🟡 MOYEN |
| `wasteMetalKg` | Rapports détaillés | < 15% | 🟡 MOYEN |
| `wasteMixteKg` | Rapports détaillés | < 15% | 🟡 MOYEN |

---

## 🔗 Dépendances identifiées

### API Backend (`createAction`)
```typescript
// Payload actuel (35+ champs)
interface CreateActionPayload {
  // ESSENTIELS (à conserver)
  wasteKg: number;
  volunteersCount: number;
  actionDate: string;
  locationLabel: string;
  
  // AUTOMATISABLES (à générer côté client)
  actorName: string; // <- depuis Clerk
  associationName: string; // <- depuis profil
  latitude?: number; // <- GPS/géocodage
  longitude?: number; // <- GPS/géocodage
  
  // OPTIONNELS (à rendre vraiment optionnels)
  notes?: string;
  photoAssets?: ActionPhotoAsset[];
  manualDrawing?: ActionDrawing;
  
  // SUPPRIMABLES (non utilisés ou redondants)
  routeAdjustmentMessage?: string; // <- jamais utilisé
  visionBagsCount?: string; // <- training IA uniquement
  // ... autres champs techniques
}
```

### Base de données
```sql
-- Table actions (colonnes utilisées)
SELECT 
  waste_kg,           -- ✅ CRITIQUE - Calculs impact
  volunteers_count,   -- ✅ CRITIQUE - Calculs impact  
  action_date,        -- ✅ CRITIQUE - Tri/filtres
  location_label,     -- ✅ CRITIQUE - Géolocalisation
  actor_name,         -- ✅ IMPORTANT - Attribution
  association_name,   -- ✅ IMPORTANT - Rapports
  notes,              -- 🟡 OPTIONNEL - Rarement lu
  latitude,           -- 🟡 AUTO - Géocodage possible
  longitude,          -- 🟡 AUTO - Géocodage possible
  route_adjustment,   -- ❌ INUTILE - Jamais utilisé
  vision_bags_count   -- ❌ TECHNIQUE - Training IA
FROM actions;
```

### Rapports et exports
```typescript
// Champs utilisés dans les rapports
interface ReportData {
  // KPI principaux
  totalWasteKg: number;        // <- SUM(waste_kg)
  totalVolunteers: number;     // <- SUM(volunteers_count)
  actionsCount: number;        // <- COUNT(*)
  
  // Segmentation
  byAssociation: Record<string, number>; // <- GROUP BY association_name
  byLocation: Record<string, number>;    // <- GROUP BY location_label
  byMonth: Record<string, number>;       // <- GROUP BY MONTH(action_date)
  
  // Détails (optionnels)
  wasteByType?: {              // <- Tri détaillé (peu utilisé)
    plastique: number;
    verre: number;
    metal: number;
    mixte: number;
  };
}
```

---

## 🎯 Plan de migration des données

### Étape 1: Mapping automatique
```typescript
// Fonction de migration v1 -> v2
function migrateFormData(oldForm: FormState): FormStateV2 {
  return {
    // Champs conservés
    actionDate: oldForm.actionDate,
    wasteKg: oldForm.wasteKg,
    volunteersCount: oldForm.volunteersCount,
    
    // Champs automatisés
    locationLabel: generateLocationLabel(
      oldForm.departureLocationLabel,
      oldForm.arrivalLocationLabel
    ),
    
    // Champs optionnels (si remplis)
    notes: oldForm.notes || undefined,
    photoAssets: oldForm.photoAssets?.length > 0 ? oldForm.photoAssets : undefined,
    
    // Champs calculés
    durationMinutes: oldForm.durationMinutes || estimateDuration({
      volunteersCount: Number(oldForm.volunteersCount),
      wasteKg: Number(oldForm.wasteKg)
    }),
    
    // Géolocalisation (si disponible)
    coordinates: (oldForm.latitude && oldForm.longitude) ? {
      latitude: Number(oldForm.latitude),
      longitude: Number(oldForm.longitude)
    } : undefined
  };
}
```

### Étape 2: Rétrocompatibilité API
```typescript
// Adapter le payload v2 pour l'API existante
function adaptPayloadForLegacyAPI(formV2: FormStateV2, userProfile: UserProfile): CreateActionPayload {
  return {
    // Données du formulaire
    ...formV2,
    
    // Données automatisées depuis le profil
    actorName: userProfile.displayName,
    associationName: userProfile.defaultAssociation || "Action spontanée",
    enterpriseName: userProfile.enterpriseName || "",
    
    // Valeurs par défaut pour les champs supprimés
    routeStyle: "souple",
    routeAdjustmentMessage: "",
    cigaretteButts: calculateButtsFromMegots(formV2.wasteMegotsKg || 0),
    
    // Champs techniques (vides)
    visionBagsCount: "",
    visionFillLevel: "",
    visionDensity: "",
    wastePlastiqueKg: "",
    wasteVerreKg: "",
    wasteMetalKg: "",
    wasteMixteKg: "",
    triQuality: "moyenne"
  };
}
```

---

## 🧪 Stratégie de tests

### Tests de régression
```typescript
describe('Form Migration', () => {
  test('should preserve essential data', () => {
    const oldForm = createLegacyFormData();
    const newForm = migrateFormData(oldForm);
    
    expect(newForm.wasteKg).toBe(oldForm.wasteKg);
    expect(newForm.volunteersCount).toBe(oldForm.volunteersCount);
    expect(newForm.actionDate).toBe(oldForm.actionDate);
  });
  
  test('should generate location from departure/arrival', () => {
    const oldForm = {
      departureLocationLabel: "Place République",
      arrivalLocationLabel: "Parc Montsouris"
    };
    const newForm = migrateFormData(oldForm);
    
    expect(newForm.locationLabel).toBe("Place République → Parc Montsouris");
  });
  
  test('should estimate duration when missing', () => {
    const oldForm = { volunteersCount: "3", wasteKg: "15", durationMinutes: "" };
    const newForm = migrateFormData(oldForm);
    
    expect(newForm.durationMinutes).toBeGreaterThan(0);
  });
});
```

### Tests A/B
```typescript
// Métriques à comparer
interface FormMetrics {
  completionRate: number;      // Taux de completion
  timeToComplete: number;      // Temps moyen (secondes)
  errorRate: number;          // Taux d'erreur validation
  userSatisfaction: number;   // Score satisfaction (1-5)
  dataQuality: number;        // Score qualité données
}

// Test A: Formulaire actuel (v1)
// Test B: Formulaire simplifié (v2)
// Durée: 2 semaines
// Échantillon: 100 utilisateurs par version
```

---

## 📋 Checklist de validation

### Avant implémentation
- [ ] Audit complet des usages backend de chaque champ
- [ ] Validation avec l'équipe produit des champs supprimables
- [ ] Tests de l'API avec payload simplifié
- [ ] Vérification des rapports existants
- [ ] Plan de communication aux utilisateurs

### Pendant l'implémentation
- [ ] Tests unitaires pour chaque fonction de migration
- [ ] Tests d'intégration API
- [ ] Tests de régression sur les rapports
- [ ] Validation UX avec utilisateurs pilotes
- [ ] Monitoring des métriques de performance

### Après déploiement
- [ ] Suivi des métriques A/B pendant 2 semaines
- [ ] Collecte feedback utilisateurs
- [ ] Analyse des données de qualité
- [ ] Ajustements basés sur les retours
- [ ] Documentation finale et formation équipe

---

## 🎯 Recommandations finales

### Approche recommandée: **Migration progressive**

1. **Phase pilote** (20% utilisateurs) - 1 semaine
   - Déploiement avec feature flag
   - Monitoring intensif des métriques
   - Collecte feedback immédiat

2. **Phase étendue** (50% utilisateurs) - 1 semaine
   - Si métriques positives, extension
   - Ajustements mineurs basés sur feedback
   - Préparation rollback si nécessaire

3. **Phase complète** (100% utilisateurs) - 1 semaine
   - Déploiement complet
   - Suppression de l'ancien formulaire
   - Documentation et formation finales

### Critères de succès
- **Temps de remplissage:** < 3 minutes (vs 5 minutes actuellement)
- **Taux d'abandon:** < 20% (vs 30-40% estimé actuellement)
- **Satisfaction utilisateur:** > 4/5 (vs 3/5 estimé actuellement)
- **Qualité des données:** Maintenue ou améliorée

### Plan de rollback
- Conserver l'ancien formulaire pendant 1 mois
- Possibilité de revenir en arrière en < 1 heure
- Sauvegarde des données pendant la transition
- Communication claire aux utilisateurs en cas de problème