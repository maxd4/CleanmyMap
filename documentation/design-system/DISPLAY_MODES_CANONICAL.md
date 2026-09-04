# Modes d’affichage CleanMyMap — matrice canonique

> **Statut** : spécification cible à intégrer au design system.
>
> **Emplacement recommandé dans le dépôt** : `documentation/design-system/DISPLAY_MODES_CANONICAL.md`
>
> **But** : définir une seule différence canonique entre les trois modes `exhaustif`, `minimaliste` et `sobre`, afin d’éviter les variantes locales par page ou composant.

## 1. Principe général

Les trois modes changent **la présentation**, pas le produit.

Ils doivent conserver :

- les mêmes routes ;
- les mêmes données ;
- les mêmes fonctionnalités ;
- les mêmes permissions ;
- les mêmes formulaires et validations ;
- les mêmes textes métier ;
- les mêmes composants canoniques ;
- la même structure sémantique HTML ;
- la même hiérarchie `PageHeader` ;
- les mêmes règles responsive fondamentales ;
- les mêmes exigences d’accessibilité.

Le mode d’affichage ne doit jamais devenir une seconde implémentation fonctionnelle d’une page.

La règle est :

```text
même produit
→ même DOM sémantique autant que possible
→ mêmes composants
→ mêmes contrats
→ tokens / classes de présentation différents selon data-display-mode
```

Le thème (`data-theme`) et le mode d’affichage (`data-display-mode`) sont deux dimensions distinctes et doivent rester composables.

---

## 2. État actuel observé sur `main`

Le dépôt déclare déjà :

```ts
DISPLAY_MODES = ["exhaustif", "minimaliste", "sobre"]
```

avec les intentions suivantes :

- `exhaustif` : charte premium complète ;
- `minimaliste` : essentiel stylé, fond uni, ombres soft, pas de blur ;
- `sobre` : accessibilité cognitive, aucun effet, statique, contrastes élevés.

L’état runtime rend sélectionnables les trois modes :

```ts
ENABLED_DISPLAY_MODES = ["exhaustif", "minimaliste", "sobre"]
```

Le parser et le setter acceptent exactement ces trois valeurs et ramènent toute
valeur inconnue vers `DEFAULT_DISPLAY_MODE`.

Le choix `sobre` utilise la préférence existante et est persistant.

---

## 2 bis. Descriptions canoniques d’interface

Les descriptions courtes utilisées dans les sélecteurs et fiches de l’interface
sont les suivantes :

- **Exhaustif** : Expérience CleanMyMap complète.
- **Minimaliste** : Allez droit au but sans contenu superflu
- **Sobre** : Adaptez le rendu visuel pour réduire la fatigue visuelle et cognitive sans modification du contenu.

Ces formulations complètent la matrice comportementale ci-dessous sans modifier
le contrat fonctionnel des modes.

---

## 3. Matrice canonique des trois modes

| Critère | Exhaustif | Minimaliste | Sobre |
|---|---|---|---|
| **Finalité** | Expérience visuelle complète CleanMyMap. | Même identité, avec beaucoup moins d’habillage visuel. | Lisibilité, accessibilité cognitive et sobriété numérique prioritaires. |
| **Statut runtime** | Mode par défaut et activé. | Activé. | Activé. |
| **Fonctionnalités métier** | Complètes. | Strictement identiques à Exhaustif. | Strictement identiques à Exhaustif. |
| **Contenu métier** | Complet. | Identique ; aucune donnée utile masquée au nom du minimalisme. | Identique ; aucune donnée utile masquée au nom de la sobriété. |
| **Structure DOM / composants** | Composants canoniques. | Mêmes composants ; variantes via tokens/classes de mode. | Mêmes composants ; variantes via tokens/classes de mode. |
| **Titre / sous-titre de page** | `PageHeader` canonique. | Même `PageHeader`, mêmes métriques. | Même `PageHeader`, mêmes métriques. |
| **Taille / graisse / tracking / line-height** | Valeurs canoniques du design system. | Identiques. | Identiques. |
| **Position du PageHeader** | `left` / `center` selon la fiche de page. | Identique à la page Exhaustif. | Identique à la page Exhaustif. |
| **Couleur du PageHeader** | Couleur de famille complète. | Même famille, rendu visuel simplifié si nécessaire. | Même famille avec contraste renforcé si nécessaire ; pas de nouvelle palette arbitraire. |
| **Police globale** | `--font-base` canonique du projet. | Même `--font-base` que Exhaustif. | Stack système dédiée `--font-sober`. |
| **Stack Sobre** | — | — | `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif` |
| **Police distante spécifique au mode** | Aucune exigence particulière supplémentaire ; ne pas ajouter de téléchargement inutile. | Aucune police supplémentaire. | **Interdite** : aucune webfont / Google Font / `.woff` / `.woff2` chargée pour le mode. |
| **Fond de page** | Fonds premium selon famille, y compris dégradés autorisés par le design system. | Fond uni ou très simple dérivé de la famille. | Fond uni, stable, à fort contraste. |
| **Dégradés décoratifs** | Autorisés selon la famille. | Supprimés par défaut ; tolérés uniquement s’ils portent une information réelle. | Supprimés. |
| **Glassmorphism** | Autorisé dans les primitives prévues. | Supprimé. | Supprimé. |
| **`backdrop-filter` / blur** | Autorisé dans les composants canoniques. | `none`. | `none`. |
| **Textures / grain / halos** | Autorisés dans les limites du design system. | Supprimés. | Supprimés. |
| **Ombres** | Ombres premium / élevées canoniques. | Une ombre douce maximum quand elle aide à séparer les plans. | Pas d’ombre décorative ; séparation par bordure / contraste. |
| **Bordures** | Selon les primitives et familles. | Plus visibles pour compenser la suppression du blur et des ombres. | Nettes et contrastées ; servent de séparation principale. |
| **Rayons / arrondis** | Rayons canoniques CMM. | Identiques. | Identiques sauf exception d’accessibilité documentée ; ne pas créer une seconde géométrie globale. |
| **Cartes** | Surfaces premium, éventuellement teintées / glass / texture selon famille. | Surfaces pleines, simples, sans blur ni texture. | Surfaces plates, lisibles, contraste élevé, aucune décoration non fonctionnelle. |
| **Boutons** | `CmmButton` avec états et effets complets du design system. | Même `CmmButton`, sans effets décoratifs lourds. | Même `CmmButton`, focus et états renforcés, aucun effet décoratif. |
| **Icônes** | Icônes canoniques, accents de famille autorisés. | Identiques, décoration secondaire réduite. | Icônes uniquement utiles à la compréhension / action ; ne jamais remplacer un libellé indispensable. |
| **Illustrations décoratives** | Autorisées avec parcimonie. | Masquées ou supprimées lorsqu’elles n’apportent aucune information. | Supprimées par défaut ; conserver uniquement les visuels informatifs. |
| **Images de contenu** | Conservées et optimisées. | Conservées si informatives. | Conservées si informatives ; lazy-loading et dimensions réservées quand applicable. |
| **Vidéo / média décoratif** | Autorisé seulement si déjà justifié par le produit. | Pas d’autoplay décoratif. | Aucun autoplay ; aucun média purement décoratif chargé spécifiquement. |
| **Animations d’entrée / reveal** | Autorisées si légères, utiles et sans layout shift. | Réduites au minimum. | Désactivées. |
| **Transitions UI** | Transitions canoniques. | Courtes, uniquement pour feedback d’état. | Instantanées ou quasi instantanées ; aucune transition décorative. |
| **Transformations hover (`translate`, `scale`)** | Autorisées si modérées. | Désactivées par défaut ; privilégier couleur / bordure. | Désactivées. |
| **Parallax / mouvement décoratif** | À éviter ; uniquement si explicitement justifié. | Interdit. | Interdit. |
| **`prefers-reduced-motion`** | Prioritaire sur le mode : réduit / désactive les mouvements. | Prioritaire. | Déjà sans mouvement ; doit rester compatible. |
| **Skeleton / chargement** | Skeleton possible avec animation légère si déjà canonique. | Skeleton simple ; animation réduite ou supprimée. | Skeleton / placeholder statique ; aucun shimmer nécessaire. |
| **Feedback async** | Complet et visible. | Identique fonctionnellement. | Identique fonctionnellement, avec signal visuel simple et explicite. |
| **Densité d’information** | Densité normale définie par chaque surface métier. | Même information, chrome visuel réduit. | Même information ; regroupement clair et lecture séquentielle favorisée. |
| **Espacement** | Tokens CMM canoniques. | Identiques sauf ajustement global documenté du mode. | Tokens CMM ; possibilité d’aérer la lecture seulement via règle globale, jamais page par page. |
| **Navigation** | Présentation complète. | Même navigation, moins d’effets. | Même navigation, contraste et focus renforcés. |
| **Menus / dropdowns / accordéons** | Animations légères autorisées. | Ouverture simple, animation courte facultative. | Ouverture sans animation décorative ; indicateur d’état textuel / iconographique clair. |
| **Formulaires** | Design complet CMM. | Même structure, surfaces simplifiées. | Même structure, contraste élevé, labels explicites, erreurs proches des champs. |
| **Focus clavier** | Visible. | Visible. | Très visible ; jamais dépendant d’une ombre subtile. |
| **Cibles tactiles** | ≥ 44 × 44 px lorsque possible. | Identiques. | Identiques ou plus généreuses si nécessaire. |
| **Contraste** | Conforme aux règles d’accessibilité du projet. | Au moins identique. | Renforcé ; la lisibilité prime sur l’effet de palette. |
| **Blanc sémantique** | `#FFFFFF` exact quand le texte est conçu comme blanc. | Identique. | Identique. |
| **Noir sémantique** | `#000000` exact quand le texte est conçu comme noir. | Identique. | Identique. |
| **Gris / slate / stone** | Autorisés lorsqu’ils expriment réellement une hiérarchie ou une famille. | Identiques. | Autorisés uniquement si le contraste reste suffisant ; ne pas transformer arbitrairement tout texte en noir. |
| **Couleur seule comme information** | Interdite. | Interdite. | Interdite, avec vigilance renforcée. |
| **Charts / dataviz** | Style complet, animations légères possibles. | Même information, effets et animations réduits. | Même information, statique, contrastée, légendes / labels accessibles. |
| **Carte interactive** | Fonctionnalité complète ; effets de survol autorisés. | Fonctionnalité identique, effets visuels réduits. | Fonctionnalité identique ; animations non essentielles désactivées, contrôles et labels lisibles. |
| **Décoration des états vides** | Illustration possible. | Illustration facultative et légère. | Texte + action prioritaire ; illustration décorative supprimée. |
| **Effets de survol** | Complets mais non indispensables à la compréhension. | Couleur / bordure principalement. | Couleur / bordure / soulignement ; aucune information disponible uniquement au hover. |
| **Effets au scroll** | Légers seulement si justifiés. | Supprimés par défaut. | Supprimés. |
| **Coût GPU** | Maîtrisé. | Réduit : pas de blur, moins d’ombres / transforms. | Minimal : pas de blur, pas d’animation décorative, pas de compositing inutile. |
| **Requêtes réseau spécifiques au mode** | Aucune requête décorative nouvelle sans justification. | Aucune ressource additionnelle par rapport à Exhaustif pour « simuler » le minimalisme. | Aucune police ou ressource décorative distante spécifique ; les appels métier nécessaires restent inchangés. |
| **Analytics / consentement** | Inchangés ; gouvernés par leur propre contrat. | Inchangés. | Inchangés : le mode d’affichage ne remplace pas les préférences de consentement. |
| **Accessibilité cognitive** | Niveau standard du produit. | Hiérarchie simplifiée visuellement. | Prioritaire : moins de stimuli, états explicites, lecture stable, absence d’effets parasites. |
| **Performance perçue** | Premium mais stable ; éviter layout shifts. | Plus légère que Exhaustif. | La plus directe et la plus stable visuellement. |
| **Responsive** | Canonique. | Même structure responsive. | Même structure responsive ; aucune variante fonctionnelle mobile spécifique au mode. |
| **Print / export** | Gouverné par les règles Print, pas par le mode utilisateur sauf décision explicite. | Idem. | Idem. |
| **Exceptions locales** | Seulement si documentées dans le design system. | Pas d’exception par page pour réintroduire blur / texture / animation. | Pas d’exception par page pour réintroduire décoration ou mouvement. |

---

## 4. Hiérarchie de décision

Lorsqu’un composant doit choisir son rendu :

```text
contrat métier / accessibilité
→ composant canonique
→ famille visuelle de la page
→ thème (mixed / dark)
→ mode d’affichage (exhaustif / minimaliste / sobre)
→ état interactif (hover / focus / disabled / loading)
```

Le mode d’affichage ne doit pas modifier :

```text
AuthN / AuthZ
données
routes
validation
règles métier
contenu obligatoire
contrats API
```

---

## 5. Contrat CSS recommandé

Le mode doit être appliqué globalement sur `<html>` :

```html
<html data-display-mode="exhaustif">
<html data-display-mode="minimaliste">
<html data-display-mode="sobre">
```

Éviter les branches React répétées du type :

```tsx
displayMode === "sobre" ? <SobrieteCard /> : <NormalCard />
```

si la différence est uniquement visuelle.

Préférer des tokens globaux :

```css
:root {
  --cmm-mode-blur: 16px;
  --cmm-mode-shadow: var(--shadow-premium);
  --cmm-mode-texture-opacity: 1;
  --cmm-mode-motion-factor: 1;
}

html[data-display-mode="minimaliste"] {
  --cmm-mode-blur: 0px;
  --cmm-mode-shadow: var(--shadow-soft);
  --cmm-mode-texture-opacity: 0;
  --cmm-mode-motion-factor: 0.25;
}

html[data-display-mode="sobre"] {
  --font-base: var(--font-sober);
  --cmm-mode-blur: 0px;
  --cmm-mode-shadow: none;
  --cmm-mode-texture-opacity: 0;
  --cmm-mode-motion-factor: 0;
}
```

La stack sobre canonique :

```css
--font-sober:
  system-ui,
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  Roboto,
  Oxygen,
  Ubuntu,
  Cantarell,
  "Open Sans",
  "Helvetica Neue",
  sans-serif;
```

Ne pas recopier cette liste dans les composants.

Le token `--font-sober` est déclaré une seule fois dans
`apps/web/src/styles/tokens.css`, importé par `apps/web/src/app/globals.css`.
Lorsque `data-display-mode="sobre"` est présent sur `<html>`, les tokens globaux
`--font-base`, `--font-sans` et `--font-display` résolvent vers cette stack. Le
`body` conserve son unique déclaration `font-family: var(--font-base)`, ce qui
fait hériter toute l’UI de la police système sans modifier les métriques
typographiques ni charger de webfont dédiée.

### Contrat surfaces & cards

Le contrat détaillé des surfaces est centralisé dans
[`SURFACES_CARDS.md`](./SURFACES_CARDS.md). Les valeurs runtime communes sont
portées par les tokens `--cmm-surface-*` et consommées par `CmmCard`,
`CmmBlockCard` et `RubriqueCard` :

- `exhaustif` conserve `blur(10px)`, les ombres soft/elevated, les textures
  autorisées et le hover `translateY(-2px) scale(1.01)` ;
- `minimaliste` supprime le blur et les textures, n'emploie aucune ombre pour
  une carte standard, limite l'elevated à `var(--shadow-soft)` et supprime les
  transforms ;
- `sobre` supprime blur, ombres, textures, gradients et transforms, avec une
  transition à `0ms` et une bordure renforcée.

Les états interactifs, le focus et la règle `prefers-reduced-motion` restent
communs aux composants ; aucune branche React ne choisit une autre surface ou
une autre fonctionnalité selon le mode.

---

## 6. Règles d’activation et de persistance

L’état runtime de la préférence doit être :

```ts
export const DISPLAY_MODES = ["exhaustif", "minimaliste", "sobre"] as const;
export const ENABLED_DISPLAY_MODES = ["exhaustif", "minimaliste", "sobre"] as const;
```

Le parsing doit accepter exactement les trois valeurs activées et rejeter toute
autre valeur vers `DEFAULT_DISPLAY_MODE`.

Le setter ne doit plus normaliser `minimaliste` ou `sobre` vers `exhaustif`.

Le choix doit continuer à utiliser la source de préférence existante :

```text
SitePreferencesProvider
→ siteDisplayModeStorage
→ STORAGE_KEYS.displayMode
→ cookie de préférence
→ data-display-mode sur <html>
```

Ne pas créer :

- nouvelle clé localStorage ;
- nouveau cookie ;
- nouveau contexte React ;
- nouveau système de préférences parallèle.

---

## 7. Règles de composition avec le thème

Le mode d’affichage et le thème ne doivent pas être confondus.

Exemples valides :

```text
dark + exhaustif
dark + minimaliste
dark + sobre
mixed + exhaustif
mixed + minimaliste
mixed + sobre
```

Le mode décide du **niveau d’effets et de complexité visuelle**.

Le thème décide principalement des **surfaces et couleurs de lecture**.

Le mode `sobre` ne signifie donc pas automatiquement « thème clair » ou « thème sombre ».

---

## 8. Invariants d’accessibilité

Ces règles sont communes aux trois modes et ne peuvent pas être dégradées en mode Exhaustif :

- navigation clavier complète ;
- focus visible ;
- labels de formulaires ;
- erreurs annoncées ;
- contraste suffisant ;
- cibles tactiles adaptées ;
- pas d’information disponible uniquement par couleur ;
- pas d’information disponible uniquement au hover ;
- aucun layout shift décoratif évitable ;
- respect de `prefers-reduced-motion`.

Le mode `sobre` renforce ces objectifs mais ne doit pas être le seul mode accessible.

---

## 9. Garde-fous à ajouter

Prévoir des contrôles ciblés pour empêcher :

- un composant qui définit sa propre logique `sobre` / `minimaliste` alors qu’un token global suffit ;
- le retour d’un `backdrop-blur-*` actif en mode `minimaliste` ou `sobre` ;
- l’ajout d’animations décoratives en mode `sobre` ;
- une police distante spécifique au mode `sobre` ;
- la duplication de la stack `--font-sober` ;
- la création de clés de préférence parallèles ;
- la disparition d’une fonctionnalité métier selon le mode.

Les allowlists doivent rester petites, commentées et justifiées.

---

## 10. Tests minimaux

| Test | Attendu |
|---|---|
| parsing `exhaustif` | conserve `exhaustif` |
| parsing `minimaliste` | conserve `minimaliste` |
| parsing `sobre` | conserve `sobre` |
| parsing valeur inconnue | fallback vers `DEFAULT_DISPLAY_MODE` |
| `setDisplayMode("minimaliste")` | applique et persiste `minimaliste` |
| `setDisplayMode("sobre")` | applique et persiste `sobre` |
| attribut HTML | `data-display-mode` reflète le choix |
| rechargement | choix restauré depuis la préférence canonique |
| mode minimaliste | pas de blur / texture décorative canonique |
| mode sobre | pas de blur / ombre décorative / animation décorative |
| mode sobre | `--font-base` résout vers `--font-sober` |
| PageHeader | mêmes métriques dans les trois modes |
| fonctionnalité | aucun contrôle métier absent selon le mode |
| `prefers-reduced-motion` | reste prioritaire sur Exhaustif et Minimaliste |

---

## 11. Critère de clôture pour Codex

Le chantier est terminé lorsque :

```text
les 3 modes sont réellement sélectionnables
+ leur choix est persisté par le système existant
+ les 3 modes partagent les mêmes composants et contrats métier
+ Exhaustif conserve l’expérience premium
+ Minimaliste supprime blur / textures / décoration lourde mais conserve l’identité
+ Sobre utilise la stack système canonique et supprime les effets décoratifs
+ aucune page ne possède une implémentation parallèle du mode
+ PageHeader et la typographie canonique conservent les mêmes métriques
+ thème et mode restent indépendants
+ accessibilité préservée dans les 3 modes
+ tests ciblés, typecheck et lint sont verts
```

---

## 12. Sources actuelles à aligner

Sources runtime principales :

```text
apps/web/src/lib/ui/preferences.ts
apps/web/src/lib/storage/ui-state-storage.ts
apps/web/src/components/ui/site-preferences-provider.tsx
apps/web/src/components/ui/site-preferences-controls.tsx
apps/web/src/app/globals.css (point d’entrée)
apps/web/src/styles/tokens.css
apps/web/src/styles/display-modes.css
```

Sources documentaires principales :

```text
documentation/design-system/README.md
documentation/design-system/PAGE_HEADER.md
documentation/design-system/BLOC_COLOR_SYSTEM_PREMIUM.md
documentation/design-system/UI_EXCEPTION_PAGES.md
documentation/architecture/technical-inventory.md
```

La règle doit converger dans ces sources sans créer plusieurs documents contradictoires.
