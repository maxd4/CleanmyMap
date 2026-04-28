# Documentation - Guide Maître IA

Documentation complète du projet CleanMyMap optimisée pour agents IA.

---

## 🎯 Démarrage Rapide IA

### Première Session
1. **OBLIGATOIRE** : Lire **AGENTS.md** (règles globales)
2. **OBLIGATOIRE** : Lire **sessions/history/latest-session.md** (contexte actuel)
3. Consulter **project_context.md** (vue d'ensemble)

### Avant Toute Modification
1. **UI** → Lire **design-system/README.md** (CRITIQUE)
2. **Sécurité** → Lire **security/README.md** (CRITIQUE)
3. **Architecture** → Consulter **architecture/README.md**
4. **Code** → Consulter **development/README.md**

---

## 📁 Structure Documentation

```
documentation/
├── AGENTS.md                    ⭐ LIRE EN PREMIER
├── project_context.md           ⭐ Vue d'ensemble
├── README.md                    ← Ce fichier
│
├── ai-guides/                   🤖 Guides spécifiques IA
│   ├── AI_MODULARIZATION_GUIDE.md
│   └── AI_MODULARIZATION_CHEATSHEET.md
│
├── sessions/                    📝 Contexte & historique
│   ├── history/latest-session.md  ⭐ LIRE AU DÉMARRAGE
│   ├── context/
│   ├── assets/
│   └── templates/
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
│   ├── ARCHITECTURE.md
│   ├── adr/
│   └── [7 autres fichiers]
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
│   ├── GAMIFICATION_ENGINE.md
│   └── quiz-srs.md
│
├── liberte-UX-UI/              🎨 Audits UX/UI
│   └── [10 dossiers de blocs]
│
├── plans/                       📅 Plans futurs
│   └── visual_transformation_plan.md
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

## 🤖 Workflow IA Standard

### 1. Démarrage Session
```
□ Lire AGENTS.md
□ Lire sessions/history/latest-session.md
□ Consulter project_context.md si besoin
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
□ Lancer les tests
□ Documenter si nécessaire
```

### 5. Fin de Session
```
□ Mettre à jour sessions/history/latest-session.md
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
- ✅ Lire AGENTS.md au démarrage
- ✅ Lire latest-session.md pour continuité
- ✅ Consulter design-system/ avant UI
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
- **Architecture** → architecture/README.md
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
- Sessions documentées

---

**Optimisé pour** : Agents IA  
**Version** : 2.0.0  
**Dernière mise à jour** : 2025-01-XX
