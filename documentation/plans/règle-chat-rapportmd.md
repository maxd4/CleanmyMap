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

### Format Markdown et Quarto

* Le fichier source du rapport est en **Markdown**.
* Les réponses doivent donc être directement compatibles Markdown.
* Le Markdown est ensuite converti en PDF avec **Quarto**.
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

### Sources

* Ne pas mettre de numéros de source dans les paragraphes.
* Ne pas écrire `[1]`, `[2]`, etc. dans le corps du texte.
* Les sources doivent apparaître uniquement en fin de section.
* Ne pas écrire de titre du type `Références de la section`.
* Les sources doivent être listées directement sous forme de puces.
* Le numéro de source doit être cliquable directement.

Format attendu :

```md
- [[1]](URL) Auteur ou organisme, *Titre du document*, année.
- [[2]](URL) Auteur ou organisme, *Titre du document*, année.
```

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
* Ajouter les sources finales en puces cliquables lorsque nécessaire.
* Garder les tableaux lisibles.
* Employer des formulations prudentes.
* Ajouter des recommandations concrètes.
* Relier explicitement les enjeux à CleanMyMap.
* Supprimer ou éviter les traces de travail dans la version finale.
* Les commentaires comme `<!-- CODEX À PRÉCISER -->` sont des marqueurs provisoires et doivent être résolus avant publication.

### Règle synthétique

Pour les réécritures du rapport CleanMyMap, chaque section doit être directement exploitable dans un PDF Quarto : structure Markdown propre, ton académique, sources finales en puces cliquables, tableaux lisibles, formulations prudentes, recommandations concrètes et lien explicite avec les conséquences opérationnelles pour CleanMyMap.
