# Sessions — Guide IA

Contexte complémentaire et historique des sessions de développement pour les
agents IA. Cette documentation ne remplace pas les règles du dépôt ni le
contexte projet canonique.

---

## 📁 Structure

### history/
- **latest-session.md** — mémoire volatile de la dernière session ; source
  canonique de clôture et troisième source lue au démarrage ;
- **quality-audit-snapshot.md** — ressource de contexte, à consulter si le
  chantier le nécessite.

### context/ — ressources à consulter seulement lorsque nécessaires
- **fiche_projet.txt** - Fiche projet complète
- **fiche_projet_resume.txt** - Résumé du projet
- **background.txt** - Contexte général
- **impact_IA.txt** - Impact de l'IA sur le projet
- **economie_token.txt** - Économie de tokens
- **economie_token_prompt_template.md** - Template prompts économes
- **charte_modes.txt** - Charte des modes d'affichage
- **audit_vercel_clerk_supabase.txt** - Audit infrastructure
- **ateliers_DU.txt** - Ateliers Design Urbain
- **oral_DU_engagement.md** - Mémo de soutenance et trame de pitch pour le jury DU Engagement
- **Rapport_Annuel_Depollution_Citoyenne_Paris.pdf** - Rapport annuel

### assets/ — ressources à consulter seulement lorsque nécessaires
- **data_pipeline.webp** - Pipeline de données
- **ecosystem_overview.webp** - Vue d'ensemble écosystème
- **monorepo_structure.webp** - Structure monorepo
- **security_architecture.webp** - Architecture sécurité
- **LEGENDES.md** - Légendes des diagrammes
- **SOURCE_SCHEMAS.md** - Schémas sources

### templates/ — ressources à consulter seulement lorsque nécessaires
- **diagram-flow.mmd** - Template diagramme de flux
- **diagram-sequence.mmd** - Template diagramme de séquence
- **schema-rubrique.md** - Template schéma rubrique

---

## Sources canoniques au démarrage

Lire uniquement ces trois sources avant de commencer une session :

1. `AGENTS.md` ;
2. `documentation/project_context.md` ;
3. `documentation/sessions/history/latest-session.md`.

Le bootstrap vérifie leur présence sans charger automatiquement les autres
fichiers de `context/`, `assets/`, `templates/` ou de l'historique.

## Ressources complémentaires

- consulter `context/` uniquement pour le contexte nécessaire au chantier ;
- consulter `assets/` uniquement pour une analyse ou une vérification visuelle
  qui le justifie ;
- consulter `templates/` uniquement pour produire le document ou diagramme
  concerné ;
- ne pas traiter une ressource complémentaire comme une nouvelle source de
  vérité concurrente.

---

## Workflow Session IA

```
1. Lire les trois sources canoniques
   ↓
2. Comprendre le contexte actuel
   ↓
3. Consulter les ressources complémentaires si besoin
   ↓
4. Développer
   ↓
5. Mettre à jour `documentation/sessions/history/latest-session.md` en fin de session
```

---

## Règles clés

### Continuité
- Toujours lire les trois sources canoniques au démarrage
- Comprendre ce qui a été fait avant
- Continuer le travail en cours

### Contexte
- Utiliser `context/`, `assets/` et `templates/` seulement lorsque nécessaire

### Économie
- Optimiser les prompts avec `context/economie_token_prompt_template.md`
- Éviter les répétitions inutiles
- Être concis et précis

---

## 📝 Mise à Jour de Session

En fin de session, mettre à jour uniquement
`documentation/sessions/history/latest-session.md` avec :
- Ce qui a été fait
- Ce qui reste à faire
- Les décisions prises
- Les blocages éventuels

---

Les historiques de session restent des historiques : ils ne doivent pas être
réécrits pour se présenter comme l'état courant du projet.
