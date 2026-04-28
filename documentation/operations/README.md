# Operations - Guide IA

Documentation opérationnelle pour agents IA.

---

## 🔧 Fichiers Essentiels pour IA

### Déploiement
- **runbook-deploiement.md** - Runbook de déploiement
- **checklist-push-deploy.md** - Checklist avant déploiement
- **cloudflare-uptimerobot-checklist.md** - Monitoring

### Incidents & Maintenance
- **INCIDENT_RUNBOOK_SHORT.md** ⭐ - Runbook incidents (court)
- **incidents-frequents-et-reprise.md** - Incidents fréquents
- **MAINTENANCE.md** - Guide maintenance

### Monitoring & Logs
- **runbook-monitoring-logs.md** - Monitoring et logs
- **CLERK_SESSION_DASHBOARD_CHECK.md** - Vérification sessions Clerk

### Sessions & Mémoire IA
- **agent-memory-governance.md** ⭐ - Gouvernance mémoire IA
- **session-standard-runbook.md** - Runbook sessions standard

### Changelog
- **CHANGELOG.md** - Historique des changements

### Import de Données
- **data-import/** - Documentation import données
  - **pipeline-import.md** - Pipeline d'import
  - **schema-normalisation.md** - Schéma de normalisation
  - **mapping-colonnes.md** - Mapping colonnes
  - **regles-nettoyage-et-cas-limites.md** - Règles de nettoyage

---

## 🤖 Instructions IA

### Avant Déploiement
1. Lire **checklist-push-deploy.md**
2. Vérifier **runbook-deploiement.md**
3. S'assurer que les tests passent

### En Cas d'Incident
1. Consulter **INCIDENT_RUNBOOK_SHORT.md** immédiatement
2. Vérifier **incidents-frequents-et-reprise.md** pour solutions connues
3. Documenter l'incident dans **CHANGELOG.md**

### Gestion de Session
1. Suivre **agent-memory-governance.md** pour la mémoire
2. Utiliser **session-standard-runbook.md** pour workflow

### Import de Données
1. Consulter **data-import/pipeline-import.md**
2. Respecter **data-import/schema-normalisation.md**
3. Appliquer **data-import/regles-nettoyage-et-cas-limites.md**

---

## 📊 Workflow Déploiement IA

```
1. Vérifier checklist-push-deploy.md
   ↓
2. Lancer les tests
   ↓
3. Suivre runbook-deploiement.md
   ↓
4. Vérifier monitoring
   ↓
5. Documenter dans CHANGELOG.md
```

---

## 🚨 Workflow Incident IA

```
1. Consulter INCIDENT_RUNBOOK_SHORT.md
   ↓
2. Identifier le type d'incident
   ↓
3. Appliquer la solution
   ↓
4. Vérifier la reprise
   ↓
5. Documenter
```

---

## ✅ Checklist Opérationnelle IA

```
□ Tests passent
□ Checklist déploiement suivie
□ Monitoring configuré
□ Logs accessibles
□ Runbook incident connu
□ Changelog mis à jour
□ Sessions IA gérées correctement
```

---

**Optimisé pour** : Agents IA  
**Dernière mise à jour** : 2025-01-XX
