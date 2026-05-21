# Dossier de validation institutionnelle

## Objet

Ce dossier couvre le **Message 13** de `documentation/plans/ateliers_DU.md`.

Il regroupe les pieces de preuve institutionnelles necessaires pour justifier le projet sur les plans :

- impact IA ;
- gouvernance ;
- sobriete numerique ;
- maintenance et durabilite.

## Pieces de reference

### 1. Audit d'impact IA

- [impact_IA.md](/C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/documentation/plans/impact_IA.md)

Contient :

- l'analyse environnementale et sociale ;
- la densite d'utilite reelle ;
- la dette ecologique future ;
- la sobriete numerique ;
- la dependance technologique ;
- la synthese jury et le glossaire.

### 2. Journal d'impact DU

- [journal_impact_DU.md](/C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/documentation/plans/journal_impact_DU.md)

Contient :

- les ameliorations effectivement implementees ;
- l'annexe de pilotage IA ;
- la trace des arbitrages issus des ateliers DU.

### 3. Gouvernance de sobriete et usage IA

- [documentation/ai-guides/GOVERNANCE.md](/C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/documentation/ai-guides/GOVERNANCE.md)
- [documentation/ai-guides/SOBRIETY_RULES.md](/C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/documentation/ai-guides/SOBRIETY_RULES.md)
- [documentation/operations/pre-release-security-check.md](/C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/documentation/operations/pre-release-security-check.md)

### 4. Maintenance et continuite

- [documentation/operations/MAINTENANCE.md](/C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/documentation/operations/MAINTENANCE.md)
- [documentation/maintenance/ci-cd-metrics-report.md](/C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/documentation/maintenance/ci-cd-metrics-report.md)
- [documentation/operations/vendor-exit-strategy.md](/C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/documentation/operations/vendor-exit-strategy.md)
- [documentation/architecture/traceability-matrix.md](/C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/documentation/architecture/traceability-matrix.md)

## Etat institutionnel par axe

| Axe | Etat | Preuve principale | Limite restante |
| --- | --- | --- | --- |
| Audit d'impact IA | Solide | `impact_IA.md` sections 1 a 24 | statistiques gelees, pas de logs complets de tokens |
| Gouvernance humaine | Solide | `GOVERNANCE.md`, templates PR, section 22 | workflow editorial humain encore a renforcer |
| Sobriete numerique | Solide | `SOBRIETY_RULES.md`, audit sobriete, IUR | gains encore partiels sur certains parcours lourds |
| Maintenance long terme | Intermediaire | `MAINTENANCE.md`, `ci-cd-metrics-report.md` | tests ciblés et routine finale encore incomplets |
| Souverainete technique | Intermediaire | `vendor-exit-strategy.md`, section 15 de l'audit | lock-in encore eleve sur Clerk / Supabase / Vercel |

## Checklist de validation institutionnelle

- [x] Audit d'impact IA consolide
- [x] Journal d'impact DU aligne sur les travaux reels
- [x] Regles de gouvernance IA explicites
- [x] Charte de sobriete disponible
- [x] Maintenance documentee
- [x] Strategie de sortie initiale documentee
- [x] Tracabilite documentaire des parcours coeur documentee
- [ ] Workflow editorial humain complet sur contenus environnementaux
- [ ] Verification finale complete multi-parcours

## Usage recommande

Ce dossier sert de page d'entree pour :

- un jury DU ;
- un partenaire institutionnel ;
- un relecteur externe voulant verifier la coherence entre audit, gouvernance, maintenance et durabilite.
