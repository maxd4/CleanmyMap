# Reports — deux thèmes PDF comparables et réutilisation scientifique

> **Statut : `PLAN` — spécification produit et critères d'acceptation, non fonctionnalité livrée.**
>
> **Domaine :** générateur `/reports`, rendu PDF et exploitation scientifique des rapports d'impact CleanMyMap.
>
> **Frontière :** ce document ne définit aucune formule KPI, aucune table Supabase, aucune autorisation, aucun nouveau niveau de détail et aucun second moteur PDF. Les comportements `CURRENT` demeurent décrits dans la [fiche `/reports`](../../pages_site/routes/03-cartographie-impact/reports/reports-README.md), le [modèle Reports](../../../apps/web/src/lib/reports/report-model/README.md) et les contrats runtime.

## 1. Décision produit

Proposer **deux habillages visuels du même rapport**, au choix de l'utilisateur :

| Identifiant cible (à confirmer à l'intégration) | Libellé utilisateur | Destination principale | Direction visuelle |
|---|---|---|---|
| `impact` | **Impact** | Associations, entreprises, mécènes, collectivités et partenaires | Éditorial, institutionnel, identité CleanMyMap affirmée, fonds et contrastes soignés |
| `scientific` | **Scientifique** | Chercheurs, universités, bureaux d'études et organismes publics | Blanc dominant, composition sobre, traits fins, priorité à l'information et à la référence |

Le choix du thème détermine **l'apparence**, pas le contenu ni les calculs. Les deux thèmes ne sont pas des catégories d'utilisateurs ou des règles d'AuthZ : un compte autorisé à générer le rapport peut choisir l'un ou l'autre, indépendamment de son rôle. La variante Impact n'est pas réservée aux seules entreprises.

### Axes indépendants

```
Périmètre + période + données canoniques
                ↓
           ReportModel
                ↓
  ModuleState + niveau de détail
                ↓
       Composition logique unique
                ↓
       thème Impact | Scientifique
                ↓
     Même rapport, habillage différent
```

- **Périmètre/période** : définissent les actions et autres données admissibles.
- **`ModuleState`** : détermine les chapitres facultatifs réellement inclus.
- **`detailLevel`** : `concis`, `default`, `exhaustif` ; détermine la profondeur documentaire, selon le contrat déjà livré.
- **Thème** : détermine uniquement les surfaces, les couleurs, la typographie, les bordures, la hiérarchie décorative et les fonds. Aucun thème ne change les KPI, les unités, les limites ou la sélection des modules.

À niveau de détail et modules identiques, les deux versions doivent être facilement comparables **page par page**.

## 2. Invariants de comparaison des pages

Une composition commune définit les **blocs, leurs identifiants, leur ordre et leur emplacement de référence**. Les mêmes données occupent les mêmes zones d'une page dans les deux thèmes.

| Élément | Contrat commun | Variation autorisée |
|---|---|---|
| Couverture | Même titre, identifiants, date, périmètre, version et zone de résumé | Fond, accent, styles de titre, décor |
| KPI | Mêmes indicateurs, ordre, unités, dénominateurs et position de carte | Fond de carte, contour, couleurs, poids visuel |
| Figures et cartes | Même figure source, numéro, domaine de données, échelle, légende, emplacement | Palette et décor compatibles avec l'accessibilité |
| Tableaux | Mêmes colonnes, lignes, intitulés, tri, numéros et unités | Trames, traits, typographie et couleurs |
| Méthode, limites, sources | Même texte, identifiants de références et présence à niveau égal | Encadrés, filets et fond de section |
| Annexes | Mêmes objets et même ordre si le module est activé | Habillage uniquement |

**La pagination identique est un objectif vérifiable sur des fixtures fixes**, pas une garantie sans test : des métriques de police ou de retours à la ligne peuvent déplacer des pages. Utiliser une grille A4, des dimensions de composants, des espacements et des métriques typographiques partagés. Toute différence de pagination significative doit être motivée ; ne jamais supprimer une information pour forcer l'égalité.

Le thème Impact peut utiliser davantage de couleurs ou de textures, mais ne doit pas : déplacer les chiffres, rendre la légende décorative, rasteriser le texte ni ajouter une photographie dont la présence changerait la composition. Une photographie métier, lorsqu'elle est autorisée et incluse, doit occuper le **même emplacement dans les deux thèmes** ; une image purement décorative reste facultative et n'est pas une preuve.

### Exemple d'une même page, deux traitements

| Zone A4 | Impact | Scientifique |
|---|---|---|
| En-tête (même emplacement) | Bandeau de marque contrasté | Filet fin + titre sombre |
| Bloc KPI 2 × 2 | Cartes avec fonds colorés | Cartes blanches avec contour léger |
| Figure 01 | Palette accessible de marque | Palette discrète / adaptée au noir et blanc |
| Légende Figure 01 | Légende de lecture claire | Même légende + même identifiant stable |
| Sources et limites | Note encadrée | Note typographique et filet |

## 3. Directions visuelles et design system

### Thème `impact`

- Identité visuelle professionnelle et lisible à l'impression : grands chiffres **sans inventer de mise en scène statistique**, titres marqués, surfaces colorées, fonds soignés, respiration entre sections.
- Un rendu destiné aux entreprises, associations et collectivités sans connotation commerciale trompeuse.
- Décliner les tokens, ressources et principes du design system CleanMyMap plutôt que créer une nouvelle palette indépendante.
- Préserver des contrastes lisibles, une version imprimable sans dépendance aux fonds de page, et la signification des séries même en niveaux de gris.

### Thème `scientific`

- Fond blanc majoritaire, texte sombre, grille rigoureuse, peu d'accents et absence de textures inutiles.
- Titres hiérarchisés et numérotés, chiffres tabulaires, unités visibles, tableaux légendés, références repérables.
- Graphiques compréhensibles sans leur couleur seule ; conserver les marqueurs, axes, échelles et notes de méthode.
- Ne pas ajouter de nouveau contenu scientifique en changeant de thème : **mêmes notes, mêmes sources et mêmes limites que le thème Impact** au même niveau de détail.

### Owners à respecter

- Design system : `documentation/design-system/` (notamment `BRAND.md`, `TYPOGRAPHY_SYSTEM.md`, `DATA_DISPLAY_TABLES_KPI.md`, les couleurs et contrastes).
- Modèle et calculs : `apps/web/src/lib/reports/report-model/`, calculateurs d'impact et leurs tests.
- Composition actuelle : `apps/web/src/lib/reports/report-pdf-data.ts`, `ModuleState` et sélecteur de détail.
- Rendu officiel : `apps/web/src/lib/pdf-export/official-report-html.ts`, `report-pdf-theme.ts`, `browser-report.ts` et leurs consommateurs.
- Rendu de secours : `apps/web/src/lib/pdf-export/simple-pdf-serialization.ts` et `simple-pdf-content.ts` ; **ne pas assimiler ses capacités à celles du flux HTML imprimable**.
- Master Pack : `documentation/features/reports/master-pack.md`, limité à sa responsabilité de chapitres ; ne pas le transformer en second contrat graphique.

Les modes globaux d'affichage du site (`sobre`, `minimaliste`, etc.) ne sont **pas** les identifiants de ces deux thèmes PDF.

## 4. Citabilité scientifique — exigences de la future livraison

Chaque rapport généré devrait permettre de construire une référence stable à partir de **métadonnées véridiques** :

- Titre exact du rapport et éditeur/organisation effectivement identifiable ; ne pas inventer d'auteur.
- Date de génération, période et périmètre étudiés, et si nécessaire convention de timezone.
- Identifiant de génération existant et version de snapshot ; versions de template/renderer/méthodes/facteurs **seulement si elles existent et sont effectivement persistées**.
- Identité claire des métriques, unités, définitions, fenêtres, dénominateurs, couverture et statut des inconnues.
- Références scientifiques ou institutionnelles avec lien, date/version et périmètre, lorsqu'elles sont réellement associées aux calculs.
- Numérotation stable des figures, tableaux et sections entre thèmes, indépendamment des couleurs.
- Identifiants machine stables par indicateur/figure/tableau, distincts des titres traduits ou des positions dans un tableau.

### Référence prête à copier — modèle conceptuel

```text
[Éditeur attesté]. ([Année]). [Titre du rapport].
CleanMyMap, génération [identifiant], [version de données si connue].
[Périmètre], [période]. [URL pérenne si autorisée et effectivement résoluble].
```

Il s'agit d'un **gabarit**, pas d'une citation déjà disponible. Aucune URL publique permanente ne doit être fabriquée pour un rapport privé ; les accès restent owner-scoped et régis par l'AuthZ existante. Aucun DOI n'est émis sans enregistrement réel auprès d'un organisme habilité et landing page maintenue. Un UUID interne n'est pas un DOI.

## 5. Exploitabilité machine et accessibilité

Une page *visuellement* sobre n'est pas, en soi, un PDF machine-readable. La livraison cible distingue :

1. **Texte extractible et Unicode fiable** : texte réel sélectionnable et recherchable, accents et caractères non ASCII préservés ; pas de rapport intégral en image.
2. **Structure sémantique du PDF** : titres, paragraphes, listes, tableaux avec en-têtes, figures, textes alternatifs lorsque requis, liens, signets et ordre de lecture cohérent ; viser une sortie *Tagged PDF* vérifiable et étudier PDF/UA selon les outils réellement disponibles.
3. **Tabulaires et unités** : données et légendes extractibles sans deviner les colonnes, absence distincte du zéro réel, identifiants stables, provenance et unités liées à chaque métrique.
4. **Données structurées associées** : préférer un export JSON/CSV réellement construit depuis le **même snapshot immuable** que le PDF, avec un schéma versionné, plutôt qu'un OCR ou une reconstitution postérieure du PDF. Toute donnée exportée doit respecter les droits, les projections publiques et les restrictions existantes.
5. **Liens entre représentations** : relier de façon vérifiable les valeurs du PDF, les séries de figures/tableaux et les entrées JSON/CSV (mêmes métriques et unités, mêmes filtres, même provenance).
6. **Pérennité optionnelle** : évaluer PDF/A-3 avec fichiers associés pour des packages autoportants, *après* preuve de compatibilité et validation ; PDF/A-3 seul ne garantit pas les tags, l'accessibilité ni l'extraction correcte. Ne pas annoncer PDF/A, PDF/UA ou conformité WCAG sans test adapté.

### Limites observables du pipeline actuel

- Le parcours courant ouvre principalement **un HTML imprimable**, pas un binaire PDF généré côté serveur.
- Une voie de secours fabrique un PDF textuel simplifié. Elle n'implémente pas à elle seule un arbre de tags sémantiques ni l'intégration de fichiers JSON/CSV ; sa primitive d'échappement textuel dégrade actuellement les caractères hors ASCII.
- Les snapshots historiques permettent déjà la relecture sans recalcul des actions, mais ne constituent pas une preuve de conformité PDF/UA ou PDF/A-3.
- Les exigences de ce document sont **PLAN** tant qu'elles ne sont pas exercées, vérifiées et documentées comme `CURRENT`.

## 6. Contrats de sélection, historique et sécurité

- Le thème est orthogonal au niveau de détail, à `ModuleState`, au scope, à la période, au quota et aux autorisations.
- Ne pas créer un second moteur, une seconde source de données ni de formule scientifique alternative.
- Le rendu d'un même snapshot sous deux thèmes ne doit pas modifier les chiffres ni recalculer silencieusement les actions.
- Une génération historisée doit conserver les informations nécessaires pour rendre **le thème initial** si le thème devient une propriété persistée. Prévoir une lecture explicite de la valeur legacy (rendu historique actuel) sans migrer à l'aveugle.
- « Voir » / « Télécharger à nouveau » doivent rester des relectures, sans nouvelle génération ni consommation de quota, selon les garanties existantes. Changer vers un nouveau thème après coup n'est pas automatiquement un simple réexport : décider ce contrat lors du chantier de versionnement.
- Ne jamais exposer des médias privés, identifiants personnels non autorisés ou données réservées par un export machine supposé scientifique.
- Pour les liens de citation, ne jamais rendre public un rapport privé par défaut.

## 7. Prototype de validation à réaliser avant intégration complète

Définir **une seule page commune** de référence avec : en-tête et contexte, grille de 4 KPI, Figure 01 avec légende et source, Tableau 01 avec unités, encadré de limites et pied de page. Construire les deux rendus à partir de **la même fixture de snapshot** ; ne pas ajouter les deux thèmes à tout le produit avant l'évaluation de ce prototype.

Scénarios de validation attendus :

1. **Équivalence logique** : même ordre/ID de blocs et mêmes données dans les deux thèmes, pour chaque niveau de détail applicable et chaque état de modules.
2. **Comparaison spatiale** : sur A4, mêmes positions de référence des blocs, géométries de cartes et de tableaux, pagination comparable, sans débordement, clipping ou décalage de données.
3. **Données absentes** : vérifier `inconnu` ≠ `0`, unités, proxys, états indisponibles, couverture tronquée et absence des modules désactivés.
4. **Contraste/impression** : noir et blanc, fond désactivé, légendes lisibles, images sans informations uniquement colorées.
5. **Extraction** : extraction automatique des titres/valeurs/unités, ordre de lecture, correspondances figure/tableau, conservation Unicode ; mesurer et consigner les écarts.
6. **Sémantique** : inspection réelle des tags/tableaux/ordre de lecture lorsque le moteur PDF choisi le permet ; une inspection de HTML seul n'est pas une preuve du PDF final.
7. **Échange de données** : comparaison exacte des valeurs accessibles entre le PDF et l'éventuel CSV/JSON du **même snapshot**, absence de fuite de données privées.
8. **Historique** : compatibilité de lecture des anciennes générations, invariance des données et comportement de réexport inchangé.

Une capture ou une maquette graphique ne prouve ni le moteur final ni la conformité d'accessibilité.

## 8. Séquencement et périmètre

**Lot D — présent document uniquement :** enregistrer la direction produit et les contraintes de rendu, sans code, migration, nouvelle route, faux export ni nouveau sélecteur visible.

**Lot P — futur prototype :** décider les métriques de comparaison, créer la page de référence, tester le support réel de génération PDF et d'extraction ; écarter les solutions qui imposent deux compositions divergentes.

**Lot R — future intégration :** exposer les thèmes sur `/reports` uniquement après prototypes probants, versionner leurs paramètres au bon endroit et conserver la compatibilité historique, les autorisations et les quotas.

**Lot S — futur renforcement scientifique :** PDF balisé vérifié, métadonnées citables, export structuré du snapshot et éventuellement PDF/A-3 ; séparer les capacités réellement validées des cibles ultérieures.

Le présent lot n'autorise pas l'exécution des lots P/R/S. Les travaux de versionnement et de génération dérivée déjà planifiés restent une responsabilité distincte et une dépendance à coordonner, pas une nouvelle base de données à créer ici.

## 9. Références d'inspiration — non normatives

Ces publications servent à observer **le langage graphique ou la citabilité**, pas à reprendre leur structure, leurs textes, leurs images ou leurs données :

| Publication PDF | Inspiration observée |
|---|---|
| [charity: water — Annual Report 2024](https://assets.ctfassets.net/2w85ks0ylymt/4cROclPCnsZlyXB57vNiNv/d2a64c86310cc59a9e10913c546f4605/183791_-_FY_2024_Annual_Report_Final.pdf) | Grands indicateurs, contraste, rythme éditorial, communication associative |
| [LEGO Group — Annual Report 2024](https://www.lego.com/cdn/cs/aboutus/assets/blt1cdf90a38318ef56/the_LEGO_Group_Annual_Report_2024.pdf) | Expression de marque et traitement graphique corporate |
| [NIST — AI Risk Management Framework 1.0](https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=936225) | Composition institutionnelle, numérotation, sobriété des en-têtes |
| [PNUD — Human Development Report 2023/24, Snapshot](https://hdr.undp.org/system/files/documents/global-report-document/hdr2023-24snapshoten.pdf) | Figures numérotées, notes de graphique et sources associées |

### Références techniques — documents externes, non preuves du runtime

- [W3C — WCAG technique PDF3 : ordre de lecture](https://www.w3.org/WAI/WCAG22/Techniques/pdf/PDF3.html).
- [PDF Association — FAQ Tagged PDF](https://pdfa.org/resource/tagged-pdf-q-a/).
- [PDF Association — ISO 19005-3 / PDF/A-3](https://pdfa.org/resource/iso-19005-3-pdf-a-3/).
- [DataCite — Metadata Schema](https://schema.datacite.org/) et [pré-requis de dépôt d'un DOI](https://support.datacite.org/docs/getting-started-guides).

## 10. Conditions de clôture de cette spécification documentaire

- Le contrat **deux thèmes / une composition** est localisé dans cette source PLAN unique, sans contradiction avec les niveaux de détail et modules `CURRENT`.
- Les fiches et index nécessaires pointent vers ce document sans recopier le contenu.
- Aucun document CURRENT ne prétend que le choix de thème, la citation automatique, le Tagged PDF, le PDF/A-3 ou l'export machine associé sont déjà livrés.
- Le chemin d'implémentation, les limites du renderer actuel, le prototype préalable et les critères de test sont explicités.
- Aucun nouveau runtime, migration, asset, screenshot ou fichier généré n'est créé dans ce lot.
