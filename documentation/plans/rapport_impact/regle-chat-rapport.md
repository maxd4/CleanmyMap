## Règles de travail pour le rapport IA du projet CleanMyMap.fr

### Format général des réponses

* Répondre uniquement avec le texte final prêt à copier-coller lorsque la demande concerne une amélioration, une réécriture ou une insertion dans le rapport.
* Ne pas ajouter d’introduction, d’explication, de justification, de commentaire annexe ou de conclusion hors texte.
* Produire un texte directement exploitable dans le rapport.
* Conserver un ton académique, clair, institutionnel et défendable en soutenance.
* Développer suffisamment les idées, sans se limiter à une reformulation courte.
* Ajouter des recommandations concrètes lorsque cela améliore la valeur de la section.
* Ajouter de la culture générale utile aux néophytes lorsque cela aide à comprendre le sujet.
* Éviter les formulations trop vagues ou trop générales.

### Ton institutionnel

* Maintenir un ton impersonnel, public et institutionnel dans tout le rapport.
* Éviter les formulations à la première personne, sauf dans une citation directe ou un témoignage explicitement assumé.
* Remplacer `ton`, `ta`, `tes`, `vous`, `votre`, `vos`, `nous`, `notre`, `nos`, `je` et leurs formes dérivées par des tournures factuelles, par `CleanMyMap`, par `le rapport`, par `l’analyse` ou par `le présent audit` selon le référent.
* Préférer `CleanMyMap` lorsque le référent est le projet, `le rapport` lorsque le référent est le document, et `le développeur` ou `l’équipe projet` lorsque l’humain doit rester identifié.
* Si le référent exact n’est pas certain, signaler l’ambiguïté par `<!-- CODEX À PRÉCISER -->`.
* Conserver un style clair, académique et défendable en soutenance, sans ton conversationnel ni adresse directe au lecteur.

### Format Markdown et Quarto

* Le fichier source du rapport est en **Markdown**.
* Les réponses doivent donc être directement compatibles Markdown.
* Le Markdown est ensuite converti en PDF avec **Quarto**.
* **Règle stricte** : Ne jamais mettre de numéros de section ou de titre en dur (ex: `1.`, `## 2.`). Ces numéros sont générés automatiquement par Quarto lors de l'export. Utilisez uniquement la hiérarchie standard (`#`, `##`, `###`).
* Il est possible d’utiliser, lorsque cela améliore la lisibilité :

  * tableaux Markdown ;
  * callouts Quarto ;
  * encadrés ;
  * page breaks ;
  * blocs visuels compatibles PDF.

Exemples autorisés :

```md
::: {.callout-note}
Ce point doit être lu comme un ordre de grandeur, non comme une mesure instrumentée.
:::
```

```md
{{< pagebreak >}}
```

* Les callouts Quarto doivent être utilisés avec parcimonie, uniquement lorsqu’ils améliorent réellement la lisibilité PDF.
* Les tableaux doivent rester lisibles en PDF, idéalement avec **3 à 5 colonnes maximum**.
* Si un tableau devient trop large, le condenser ou le transformer en liste structurée.

### Structure du rapport

* Respecter strictement la structure Markdown existante.
* Ne pas changer la numérotation des titres sauf demande explicite.
* Si une section commence par `### 3.5.4`, conserver ce niveau et ce numéro.
* Ne pas déplacer une section sauf demande explicite.
* Ne pas transformer une sous-section en section plus haute ou plus basse sans raison claire.
* Éviter les sections trop longues en utilisant si besoin :

  * sous-parties ;
  * tableaux ;
  * listes structurées ;
  * callouts ;
  * paragraphes plus courts.

### Restructuration progressive du rapport

* Lorsqu’il s’agit de restructurer le rapport, ne pas réécrire tout le contenu d’un bloc.
* Préférer les opérations locales sur la structure existante :

  * déplacer une sous-partie ;
  * renommer un titre ;
  * fusionner deux sous-parties redondantes ;
  * scinder une sous-partie trop longue ;
  * réordonner des blocs déjà présents.
* Conserver les idées importantes déjà présentes dans le texte.
* Ne pas ajouter de contenu substantiel nouveau sans demande explicite.
* Ajouter seulement de courtes transitions si elles sont nécessaires à la lisibilité.
* Viser un plan plus lisible, plus académique et plus proche d’un rapport d’audit.
* Éviter toute restructuration qui modifierait le fond du rapport sans justification claire.

### Sources (Moteur Quarto / Citeproc)

* Le rapport utilise le moteur de bibliographie automatique de Quarto avec `bibliography: references.bib`, `reference-section-title: Bibliographie`, `link-citations: true` et `nocite: | @*`.
* Toute source doit être appelée **directement dans le texte** avec la syntaxe de citation Quarto : `[@clef_de_la_source]`.
* **Interdiction stricte** de créer des listes manuelles de sources (du type `- [1] Auteur...`) à la fin des paragraphes ou des sous-parties. Quarto s'occupe de lister les références globales à la fin du document.
* Les mentions du type `Source : ...` sont à éviter dans le corps du texte. Si une précision bibliographique est nécessaire, utiliser une citation `[@clef]`.
* Les liens Markdown vers des sites externes doivent rester exceptionnels et réservés aux cas où l’URL doit être montrée explicitement, pas pour remplacer une citation bibliographique.
* Si une nouvelle source doit être introduite, l'ajouter au fichier `references.bib` avec une clé BibTeX stable, courte et documentée.
* Ne jamais générer une URL sans certitude qu'elle est valide. En cas de doute, donner uniquement le titre exact et l'auteur.
* Privilégier les liens pérennes (DOI, HAL, arXiv, Wayback Machine) lorsque cela est possible.
* Ne pas inventer de sources.
* Si une source n’est pas connue ou vérifiable, préférer une formulation prudente.
* Privilégier les sources primaires ou institutionnelles.
* Pour les chiffres et informations techniques, privilégier :

  * AIE / IEA ;
  * ADEME ;
  * ARCEP ;
  * RTE ;
  * CNIL ;
  * NIST ;
  * OCDE ;
  * FAO ;
  * ONU ;
  * IPCC / GIEC ;
  * documentation officielle des outils.
* Pour OpenAI, Anthropic, Google, Gemini, Claude, Codex, API, prix, quotas ou modèles, privilégier les sources officielles.
* Les vidéos, blogs, articles de presse ou sources de vulgarisation doivent être signalés comme sources secondaires si elles sont utilisées.
* Ne pas présenter une source secondaire comme preuve principale d’un chiffre fort ou d’une affirmation scientifique.

### Formulations prudentes

* Employer des formulations prudentes pour les chiffres et les hypothèses.
* Utiliser des expressions comme :

  * `environ` ;
  * `ordre de grandeur` ;
  * `selon le périmètre retenu` ;
  * `peut atteindre` ;
  * `hypothèse prudente` ;
  * `semble indiquer` ;
  * `doit être interprété avec prudence`.
* Ne pas transformer une hypothèse en certitude.
* Ne pas affirmer qu’un chiffre est exact si le rapport ne repose pas sur une mesure instrumentée.
* Distinguer clairement :

  * faits établis ;
  * hypothèses ;
  * estimations ;
  * recommandations ;
  * limites restantes.

### Lien avec CleanMyMap

* Faire systématiquement le lien avec CleanMyMap.
* Chaque section théorique doit aboutir à une conséquence concrète pour le projet, par exemple :

  * risque opérationnel ;
  * règle de gouvernance ;
  * recommandation technique ;
  * limite à reconnaître ;
  * mesure de réduction ;
  * arbitrage produit ;
  * conséquence pour l’IUR ;
  * vigilance pour les données, la sécurité ou la sobriété.
* Le rapport doit toujours rester relié au cas d’étude CleanMyMap, et ne pas devenir une dissertation générale sur l’IA.

### Balise pour Codex

* Si une précision dépend du code source réel de CleanMyMap et ne peut pas être vérifiée directement, insérer uniquement :

```md
<!-- CODEX À PRÉCISER -->
```

* Cette balise sert à signaler à Codex qu’il doit parcourir le dépôt pour compléter le passage avec des informations factuelles.
* Elle doit être utilisée lorsque le texte devrait mentionner des fichiers, routes API, composants, dépendances, métriques ou décisions techniques réelles du projet.
* Ne pas inventer ces détails.
* Ne pas utiliser la version longue de la balise.
* Utiliser seulement :

```md
<!-- CODEX À PRÉCISER -->
```

### Style d’audit

* Conserver une logique de rapport d’audit.
* Structurer les idées autour de :

  * risque identifié ;
  * mécanisme ;
  * conséquence ;
  * mesure de réduction ;
  * limite restante.
* Les recommandations doivent être concrètes et actionnables.
* Ne pas seulement décrire un problème : expliquer ce que CleanMyMap doit faire pour le limiter.
* Séparer les faits, hypothèses et recommandations lorsque cela améliore la clarté.

### Anglicismes et sigles

* Expliquer brièvement les anglicismes ou sigles importants à leur première apparition.
* Exemples :

  * **vibe coding** ;
  * **agentic coding** ;
  * **frontier model** ;
  * **RLS** ;
  * **API** ;
  * **ACV** ;
  * **IUR** ;
  * **CBRN**.
* Ne pas supposer que le lecteur maîtrise ces notions.
* Les explications doivent rester courtes et utiles au rapport.
* Dans le corps du rapport, privilégier systématiquement le français lorsqu’un équivalent existe déjà, par exemple `workflow` → `flux de travail`, `dashboard` → `tableau de bord`, `frontend` → `interface client`, `backend` → `serveur`, `build` → `compilation`, `preview` → `aperçu`, `prompt` → `instruction`, `analytics` → `mesure d’audience`, `feature` → `fonctionnalité`, `open source` → `source ouverte`, `legacy` → `héritage`, `sampling` → `échantillonnage` et `lock-in` → `enfermement propriétaire`.
* Lorsqu’un terme technique anglais n’a pas d’équivalent français naturel ou qu’il s’agit d’un nom propre, d’un outil, d’une API, d’un sigle ou d’une référence bibliographique, conserver le terme mais l’expliquer brièvement à sa première apparition.
* Les titres de sources, les noms de produits, les bibliographies et les identifiants techniques peuvent rester dans leur forme d’origine lorsqu’une francisation nuirait à la précision.

### Usage des tableaux et visuels

* Utiliser des tableaux ou autres éléments visuels compatibles Markdown lorsque cela améliore la clarté.
* Les tableaux doivent être synthétiques.
* Éviter les tableaux trop larges.
* Préférer un tableau lorsqu’il permet de comparer clairement :

  * scénarios ;
  * risques ;
  * recommandations ;
  * niveaux de criticité ;
  * outils ;
  * modèles IA ;
  * dépendances ;
  * impacts.
* Ne pas utiliser un tableau si un paragraphe simple est plus lisible.

### Règles sur les réécritures du rapport

* Lorsque l’utilisateur donne une section à améliorer, rendre une version enrichie, structurée et directement intégrable.
* Ne pas répondre avec une analyse du texte.
* Ne pas dire “voici une version améliorée”.
* Ne pas ajouter de commentaire après la section.
* Ne pas expliquer les choix éditoriaux.
* Intégrer directement les améliorations dans le texte.
* Conserver les titres donnés par l’utilisateur.
* Ne pas supprimer les idées importantes déjà présentes.
* Corriger les maladresses, répétitions, imprécisions et formulations trop faibles.
* Ajouter du détail seulement s’il améliore la rigueur, la pédagogie ou le lien avec CleanMyMap.

### Cohérence avec le PDF final

* Viser des sections directement exploitables dans un PDF Quarto.
* Maintenir une structure Markdown propre.
* Utiliser un ton académique.
* Intégrer les appels de sources Quarto (`[@clef]`) dans le texte. Ne jamais lister les sources manuellement.
* Garder les tableaux lisibles.
* Employer des formulations prudentes.
* Ajouter des recommandations concrètes.
* Relier explicitement les enjeux à CleanMyMap.
* Supprimer ou éviter les traces de travail dans la version finale.
* Les commentaires comme `<!-- CODEX À PRÉCISER -->` sont des marqueurs provisoires et doivent être résolus avant publication.

### Procédure de rendu Quarto

* Le rapport reste source canonique en `impact_IA.md`, mais le rendu PDF peut nécessiter une copie temporaire en `.qmd` si Quarto signale la présence d'éléments exécutables ou de shortcodes.
* Toujours vérifier que le front matter YAML se termine bien par `---` avant le contenu du rapport.
* Les séparateurs `{{< pagebreak >}}` doivent rester dans le corps du document, jamais dans le front matter.
* La commande de rendu validée est `quarto render impact_IA.qmd --to pdf`, lancée depuis le dossier `documentation/plans/rapport_impact`.
* Après un rendu réussi, supprimer les fichiers temporaires et intermédiaires générés par Quarto (`.qmd` de travail, `.aux`, `.log`, `.tex`, `.toc`, dossiers `_files`) afin de laisser le sous-dossier propre.
* Si le rendu échoue, inspecter d'abord les erreurs de structure du Markdown ou du YAML avant de modifier le fond du texte.

### Règle synthétique

Pour les réécritures du rapport CleanMyMap, chaque section doit être directement exploitable dans un PDF Quarto : structure Markdown propre, ton académique, appels de citations dynamiques (syntaxe `[@clef]`), bibliographie exhaustive générée automatiquement, tableaux lisibles, formulations prudentes, recommandations concrètes et lien explicite avec les conséquences opérationnelles pour CleanMyMap.
