# Outils IA utiles pour projets web et applications

Objectif de ce document: t'aider a choisir les bons outils IA selon leur impact reel sur un site ou une app (vitesse d'execution, qualite, securite, conversion, cout).

## 1\) Assistants de code (impact direct sur la vitesse de delivery)

### ChatGPT Codex

* Role: agent de developpement pour analyser le repo, coder, tester, corriger.
* Interet reel pour le site: accelere les livraisons sans sacrifier la qualite si tu imposes tests + verification.
* Quand c'est tres utile: refactor, debug difficile, migration technique, implementation end-to-end.
* Limite a surveiller: sans regles claires, l'agent peut sur-modifier ou sortir du scope.

### GitHub Copilot

* Role: autocompletion et assistance inline dans l'IDE.
* Interet reel pour le site: gain de temps quotidien sur le code repetitif, formulaires, validations, composants.
* Quand c'est tres utile: phase de production continue avec beaucoup de petits changements.
* Limite a surveiller: moins adapte aux analyses globales de codebase qu'un agent complet.

### Claude Code

* Role: agent terminal/codebase pour edits cibles.
* Interet reel pour le site: bon pour changements chirurgicaux, scripts et corrections structurelles.
* Quand c'est tres utile: maintenance, nettoyage, automatisation technique.
* Limite a surveiller: necessite un bon cadrage pour rester strictement dans l'objectif.

### Cursor

* Role: editeur AI-first avec contexte local.
* Interet reel pour le site: iteration rapide UI/API dans une boucle courte "edit -> test -> fix".
* Quand c'est tres utile: developpement rapide de fonctionnalites.
* Limite a surveiller: tendance a proposer des patches larges si le prompt est vague.

## 2\) SDK/API IA pour integrer de vraies fonctions IA dans ton produit

### Vercel AI SDK

* Role: couche d'integration unifiee pour plusieurs modeles.
* Interet reel pour le site: reduit la complexite d'integration (streaming, structured output, tool calling).
* Quand c'est tres utile: app TypeScript/Next.js avec chat, assistant, generation de contenu.
* Limite a surveiller: dependance aux conventions de la stack JS.

### OpenAI API

* Role: API pour generation texte/code, extraction structuree, assistants backend.
* Interet reel pour le site: permet de creer des fonctionnalites IA monetisables (assistant, support, aide intelligente).
* Quand c'est tres utile: fonctions coeur produit basees sur IA.
* Limite a surveiller: gestion couts, latence et garde-fous (quotas, cache, fallback).

### Gemini API

* Role: alternative multi-modele.
* Interet reel pour le site: diversifie le risque fournisseur et peut optimiser cout/perf selon les cas.
* Quand c'est tres utile: strategie multi-provider.
* Limite a surveiller: differences de comportement entre modeles a normaliser dans ton backend.

## 3\) Recherche et connaissance (RAG)

### Perplexity

* Role: recherche assistee avec synthese.
* Interet reel pour le site: utile en phase produit/strategie pour benchmark et veille.
* Quand c'est tres utile: cadrage de roadmap, comparaison concurrentielle.
* Limite a surveiller: ce n'est pas une source de verite interne de ton produit.

### RAG stack (Pinecone / Weaviate / pgvector)

* Role: recherche semantique dans tes contenus internes.
* Interet reel pour le site: transforme docs, FAQ, policies, pages internes en assistant utile pour utilisateurs/support.
* Quand c'est tres utile: forte base documentaire ou support client recurrent.
* Limite a surveiller: qualite dependante du nettoyage des donnees et du chunking.

## 4\) Productivite design et contenu

### Figma AI et design assiste

* Role: acceleration des maquettes et variantes d'interface.
* Interet reel pour le site: raccourcit le cycle idee -> prototype -> implementation.
* Quand c'est tres utile: redesign navigation, nouveaux ecrans, tests de variantes UX.
* Limite a surveiller: ne remplace pas les standards d'accessibilite et la coherence produit.

### Outils de redaction IA

* Role: aide PRD, changelog, documentation, textes UI.
* Interet reel pour le site: meilleure clarte fonctionnelle, onboarding plus rapide, moins d'ambiguite produit.
* Quand c'est tres utile: equipes qui livrent souvent et doivent garder docs alignes.
* Limite a surveiller: besoin de relecture humaine pour eviter les formulations vagues.

## 5\) Qualite, monitoring, operations

### Sentry

* Role: suivi des erreurs runtime et triage.
* Interet reel pour le site: reduit le temps pour detecter et corriger les bugs visibles en production.
* Quand c'est tres utile: app active avec utilisateurs reels.
* Limite a surveiller: bruit si instrumentation mal configuree.

### PostHog

* Role: analytics produit, funnels, retention, experiments.
* Interet reel pour le site: permet de decider sur des donnees reelles plutot que sur intuition.
* Quand c'est tres utile: optimisation conversion, onboarding, activation.
* Limite a surveiller: event tracking doit etre bien defini sinon donnees peu exploitables.

### GitHub Actions + automatisations IA

* Role: CI/CD, checks qualite, verification automatique.
* Interet reel pour le site: evite les regressions au moment des merges.
* Quand c'est tres utile: equipe ou projet avec pushes frequents.
* Limite a surveiller: pipelines mal calibres peuvent ralentir le delivery.

## 6\) Outils IA gratuits utiles (ou freemium)

### ChatGPT (gratuit)

* Interet reel pour le site: tres bon pour cadrer un besoin, transformer une idee en plan d'action.
* Bon usage: spec rapide, roadmap, prompts, contenu.

### Claude (gratuit selon disponibilite)

* Interet reel pour le site: performant pour analyser des textes longs et clarifier des specifications.
* Bon usage: audit de docs, restructuration de process, syntheses.

### Gemini (gratuit selon quotas)

* Interet reel pour le site: alternative gratuite pour diversifier l'assistance IA.
* Bon usage: generation/reformulation de contenu et support dev general.

### Continue.dev (open source)

* Interet reel pour le site: assistant dans l'IDE sans lock-in fort.
* Bon usage: equipes voulant garder controle sur leur workflow IA.

### Aider (open source)

* Interet reel pour le site: efficace pour patchs rapides en terminal.
* Bon usage: petites corrections multi-fichiers et iteration rapide.

### Ollama (local)

* Interet reel pour le site: confidentialite elevee et cout API reduit pour prototypage.
* Bon usage: essais offline et traitement de contenu sensible.

### Hugging Face (open source/freemium)

* Interet reel pour le site: experimentation rapide de modeles specialises.
* Bon usage: POC NLP, classification, recherche de modele adapte.

### Langfuse (open source)

* Interet reel pour le site: observabilite des flux IA (cout, latence, erreurs, qualite).
* Bon usage: mise en production de fonctionnalites IA avec pilotage clair.

### Flowise (open source)

* Interet reel pour le site: prototypage de workflows IA/RAG sans coder toute l'orchestration.
* Bon usage: MVP rapide avant implementation backend definitive.

