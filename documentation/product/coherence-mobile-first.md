# Coherence mobile first

## Schema responsive mobile -> tablette -> desktop
```mermaid
flowchart LR
  M[Mobile<br/>Priorites: declarer, agir, contacter] --> T[Tablette<br/>Priorites: lecture carte + filtres]
  T --> D[Desktop<br/>Priorites: pilotage, comparaison, reporting]
  M --> R1[Regle: CTA critiques pleine largeur]
  T --> R2[Regle: 2 colonnes max sur zones denses]
  D --> R3[Regle: vues analytiques detaillees]
```
Fallback statique:
```md
![Mobile first responsive fallback](../archive/fallback-ux-mobile-first-responsive.png)
```

- Prioriser les flux critiques sur mobile (declarer, agir, contacter, rejoindre).
- CTA pleine largeur quand pertinent.
- Tables/graphes avec fallback lisible sur petits ecrans.
