---
name: cleanmymap-quality-audits
description: "Utiliser pour les audits CleanMyMap dead-code, duplication, top-heavy, complexity ou cycles. Lance le runner canonique audit:quality et n'analyse en profondeur que les deltas signalés par attentionRequired."
category: repository
risk: safe
source: local
tags: "[quality, audit, dead-code, duplication, top-heavy, complexity, cycles]"
---

# CleanMyMap — audits qualité

## But

Utiliser le runner déterministe du dépôt au lieu de reconstruire un protocole d'audit dans un long prompt.

## Commandes canoniques

```bash
npm run audit:quality -- dead-code
npm run audit:quality -- duplication
npm run audit:quality -- top-heavy
npm run audit:quality -- complexity
npm run audit:quality -- cycles
npm run audit:quality -- all
```

Les artefacts régénérables sont produits sous :

```text
artifacts/quality-audits/<SHA>/
```

## Règle principale

```text
runner déterministe
→ artefacts liés au SHA
→ attentionRequired ?
   ├─ false : ne pas refaire une analyse exhaustive
   └─ true  : analyser uniquement les deltas ou décisions manquantes
```

`attentionRequired: false` ne signifie pas « aucune dette historique » ; il signifie qu'aucun nouveau delta nécessitant une revue n'a été détecté selon le contrat de l'audit.

## Dead-code

Ne pas transformer un finding Knip en suppression automatique. Si une revue est requise, respecter les classifications canoniques de `AGENTS.md` :

```text
DELETE_PROVEN
INTERNALIZE
MIGRATE
RESTORE_FUNCTIONALITY
KEEP_JUSTIFIED
```

## Duplication

Analyser les clones par **famille de responsabilité**, jamais fingerprint par fingerprint si le même invariant est en jeu. Respecter les qualifications et priorités de `AGENTS.md`.

## Top-heavy

- `REVIEW_REQUIRED` est un signal, pas une décision de split.
- Une décision architecturale déjà acquise n'est pas à refaire sans delta pertinent.
- La proximité au seuil est informative, pas une décision.
- Aucun changement mobile dans un lot web hors demande explicite.

## Complexity et cycles

Traiter uniquement les violations, stale baselines ou deltas réellement signalés. Ne pas réinventer des seuils ni relever une baseline pour rendre le résultat vert.

## Interdictions

- ne pas relancer le même moteur hors runner pour fabriquer un second rapport ;
- ne pas modifier baseline, seuil, grâce, exclusion ou justification pendant un audit read-only ;
- ne pas transformer les artefacts en nouvelle source de vérité ;
- ne pas lancer `checks:full` pour un audit read-only ni pour clôturer un lot ;
  l'utiliser uniquement avant un déploiement Vercel ou dans un prompt
  explicitement dédié à `checks:full`.
