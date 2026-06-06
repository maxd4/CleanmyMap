# Documentation - Guide Maître IA

Documentation complète du projet CleanMyMap optimisée pour agents IA.

---

## 🎯 Démarrage Rapide IA

### Première Session
1. **OBLIGATOIRE** : Lire les règles globales du projet
2. **OBLIGATOIRE** : Lire le contexte de session actuel
3. Consulter la vue d'ensemble du projet

### Avant Toute Modification
1. **UI** → Lire **design-system/README.md** (CRITIQUE)
   Puis lire **design-system/cleanmymap-ui-ux-pro-max.md** pour les écrans opérationnels, formulaires, pilotage, validation et analytics
   Puis consulter **pages_site/INDEX.md** pour l'inventaire canonique des routes UI, avec `pages_site/README.md` comme porte d'entrée
2. **Sécurité** → Lire **security/README.md** (CRITIQUE)
3. **Architecture** → Consulter **architecture/README.md** puis **architecture/master-architecture.md**
4. **Code** → Consulter **development/README.md**

### Guides IA utiles

- **[ai-guides/SPEC_KIT_PLAYBOOK.md](./ai-guides/SPEC_KIT_PLAYBOOK.md)** - workflow Spec Kit adapte a CleanMyMap.
- **[ai-guides/SPEC_KIT_ACTIONS.md](./ai-guides/SPEC_KIT_ACTIONS.md)** - liste d'actions derivee de la lecture de Spec Kit.
- **[ai-guides/MATT_POCOCK_SKILLS_PLAYBOOK.md](./ai-guides/MATT_POCOCK_SKILLS_PLAYBOOK.md)** - workflow CleanMyMap pour les skills Matt Pocock, avec quand les utiliser et les commandes de check rapides reelles.
- **[ai-guides/README.md](./ai-guides/README.md)** - porte d'entree des guides IA.
- **[development/vercel-quota-governance.md](./development/vercel-quota-governance.md)** - gouvernance des quotas Vercel et détection des régressions de coût.
- **[development/vercel-surface-report.md](./development/vercel-surface-report.md)** - rapport automatique des surfaces Vercel et de leur risque.
- **[development/performance-quotas-vercel-checklist.md](./development/performance-quotas-vercel-checklist.md)** - checklist de revue avant PR pour les surfaces Vercel sensibles.
- **[development/client-server-bundle-splitting.md](./development/client-server-bundle-splitting.md)** - règles pour garder la frontière serveur/client propre et éviter de regonfler le bundle initial.
- **[development/vercel-route-cost-audit.md](./development/vercel-route-cost-audit.md)** - audit route par route des coûts Vercel.

### Origine et attribution

- **[origin-about.md](./origin-about.md)** - origine du projet, attribution initiale, releases et traçabilité.
- **[AUTHORS.md](../AUTHORS.md)** - attribution des auteurs et repères de contribution.

### Instantanés de documentation

- **[documentation-push-status.md](./documentation-push-status.md)** - arborescence locale avec statut `✅` / `❌` / `⚪` pour suivre ce qui est déjà poussé.

---

## 📁 Structure Documentation

```
documentation/
├── README.md                    ← Ce fichier
├── guide-de-demarrage.md        ⭐ Règles et contexte de session
│
├── ai-guides/                   🤖 Guides spécifiques IA
│   ├── SPEC_KIT_PLAYBOOK.md
│   ├── SPEC_KIT_ACTIONS.md
│   ├── MATT_POCOCK_SKILLS_PLAYBOOK.md
│   ├── AI_MODULARIZATION_GUIDE.md
│   └── AI_MODULARIZATION_CHEATSHEET.md
│
├── design-system/               🎨 CRITIQUE pour UI
│   ├── README.md
│   ├── charte-ui-pro-moderne-futuriste.md
│   ├── VISUAL_STORYTELLING.md
│   └── [14 autres fichiers]
│
├── security/                    🔐 CRITIQUE pour sécurité
│   ├── README.md
│   ├── SECURITY_GUIDE.md
│   ├── SECURITY_QUICK_REFERENCE.md
│   └── [11 autres fichiers]
│
├── development/                 💻 Standards de code
│   ├── README.md
│   ├── AI_DEVELOPER_GUIDE.md
│   ├── AI_MINDSET_KAIZEN.md
│   └── [9 autres fichiers]
│
├── architecture/                🏗️ Architecture système
│   ├── README.md
│   ├── master-architecture.md
│   ├── ARCHITECTURE.md
│   ├── adr/
│   └── [7 autres fichiers]
│
├── database/                    💾 Quotas, requêtes et index Supabase
│   ├── README.md
│   ├── QUERY_INDEX_AUDIT.md
│   └── supabase-quota-audit.md
│
├── operations/                  🔧 Ops & déploiement
│   ├── README.md
│   ├── INCIDENT_RUNBOOK_SHORT.md
│   ├── agent-memory-governance.md
│   └── [9 autres fichiers + data-import/]
│
├── product/                     📋 Vision & métier
│   ├── README.md
│   ├── vision-et-objectifs.md
│   ├── audit/ (24 fichiers)
│   └── [11 autres fichiers]
│
├── features/                    🎮 Fonctionnalités
│   ├── README.md
│   ├── group-action.md
│   ├── GAMIFICATION_ENGINE.md
│   └── quiz-srs.md
│
├── specs/                       🧭 Spécifications structurées
│   ├── README.md
│   └── group-action/
│
├── liberte-UX-UI/               🎨 Audits UX/UI
│   └── [10 dossiers de blocs]
│
├── maintenance/                 🔧 Maintenance
│   ├── improvements_journal.md
│   └── vercel_deployments.txt
│
└── assets/                      🖼️ Images
    ├── map-immersive-desktop.png
    └── map-immersive-mobile.png
```

---

## Règle de captures UX/UI

Les captures d'écran canoniques des pages doivent être déposées dans le dossier `photo/desktop/` de la fiche route canonique sous `documentation/pages_site/routes/.../`, au format WebP. L'inventaire des pages et le statut de capture sont centralisés dans `documentation/pages_site/INDEX.md`. Le dossier `documentation/liberte-UX-UI/` reste un miroir legacy tant que la migration des scripts n'est pas terminée.

Chaque page du site dispose de son propre sous-dossier dans `documentation/pages_site/routes/`. Ce sous-dossier contient les captures de la page complète, un markdown dédié aux exceptions UI de la page et un markdown de présentation qui explique le fonctionnement de la page et son rôle dans le parcours utilisateur.

Jusqu'à nouvel ordre, seules les captures desktop sont produites. Les captures mobile restent documentées comme attendues, mais elles ne doivent pas être générées sans instruction explicite.

- `documentation/pages_site/routes/00-homepage/root/photo/desktop/`
- `documentation/pages_site/routes/02-agir/actions-new/photo/desktop/`
- `documentation/pages_site/routes/03-cartographie-impact/actions-map/photo/desktop/`
- etc.

Les captures temporaires, versions contexte ou exports de travail ne remplacent jamais ces fichiers WebP officiels.

---

## 🤖 Workflow IA Standard

### 1. Démarrage Session
```
□ Lire les règles globales du projet
□ Lire le contexte de session actuel
□ Consulter la vue d'ensemble du projet si besoin
```

### 2. Avant de Coder
```
□ Identifier le type de tâche
□ Consulter le README du dossier pertinent
□ Lire les fichiers essentiels
```

### 3. Pendant le Développement
```
□ Respecter les règles du domaine
□ Suivre les standards
□ Valider régulièrement
```

### 4. Avant de Commit
```
□ Vérifier les checklists
□ Toujours partir de l'état complet du repo avec `git add -A`
□ Lancer les tests
□ Documenter si nécessaire
```

### 5. Fin de Session
```
□ Mettre à jour le contexte de session
□ Documenter les décisions importantes
```

---

## 📊 Matrice de Décision IA

| Tâche | Dossiers à Consulter | Priorité |
|-------|---------------------|----------|
| Modifier UI | design-system/ | CRITIQUE |
| Ajouter API | security/, development/ | CRITIQUE |
| Refactoring | development/, architecture/ | HAUTE |
| Nouvelle feature | product/, features/ | HAUTE |
| Déploiement | operations/ | HAUTE |
| Bug fix | development/, security/ | MOYENNE |
| Documentation | development/ | MOYENNE |

---

## 🎯 Règles Globales IA

### Toujours
- ✅ Lire les règles globales au démarrage
- ✅ Lire le contexte de session pour continuité
- ✅ Consulter design-system/ avant UI
- ✅ Appliquer `cleanmymap-ui-ux-pro-max.md` sur les surfaces métier denses
- ✅ Consulter security/ avant code sensible
- ✅ Respecter les standards de development/
- ✅ Documenter les décisions importantes

### Jamais
- ❌ Modifier UI sans lire design-system/
- ❌ Coder sans vérifier security/
- ❌ Déployer sans operations/checklist
- ❌ Ignorer les tests de regression-gates
- ❌ Oublier de mettre à jour latest-session.md

---

## 🚀 Commandes Utiles

```bash
# Développement
npm run dev
npm run build
npm run lint
npm run test

# Modularisation
npm run analyze:heavy-files
npm run modularize:report <fichier>

# Sessions
npm run session:bootstrap
npm run session:close
npm run session:budget

# Validation
npm run checks
npm run test:regression-gates
```

---

## 📞 Support

### Questions sur...
- **Architecture** → architecture/README.md puis architecture/master-architecture.md
- **UI/Design** → design-system/README.md
- **Sécurité** → security/README.md
- **Code** → development/README.md
- **Ops** → operations/README.md
- **Produit** → product/README.md
- **Features** → features/README.md
- **Modularisation** → ai-guides/README.md

---

## ✨ Principes Clés

### Amélioration Continue
- Ne jamais considérer le code comme parfait
- Toujours chercher à améliorer
- Être force de proposition

### Qualité
- Tests obligatoires
- Pas de régression
- Code maintenable

### Sécurité
- Toujours valider les entrées
- Jamais exposer de secrets
- Suivre security/SECURITY_GUIDE.md

### Documentation
- Code auto-documenté
- Documentation technique à jour
- Contexte de session documenté

---

**Optimisé pour** : Agents IA  
**Version** : 2.0.0  
**Dernière mise à jour** : 2025-01-XX
