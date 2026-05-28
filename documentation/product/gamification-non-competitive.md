# Gamification non competitive

Ce document formalise une direction de gamification adaptee a CleanMyMap: **reconnaissance utile, progression lisible, pas de logique de jeu mobile ni de competition agressive**.

## Objectif produit

La gamification doit aider a:

- faire revenir les benevoles sans pression inutile ;
- rendre la progression visible et comprise ;
- reconnaitre des contributions verifiees ;
- soutenir l engagement collectif local ;
- renforcer le sentiment d utilite et de competence.

La gamification ne doit pas:

- transformer le site en jeu ;
- favoriser le volume brut au detriment de la qualite ;
- pousser a la comparaison publique permanente ;
- introduire une logique de punition ou de perte;
- masquer l impact reel derriere des points decoratifs.

## Base theorique retenue

Les sources convergent vers trois besoins psychologiques a proteger:

- **autonomie**: laisser des choix, des rythmes et des parcours flexibles;
- **competence**: donner des repères de progression, de maitrise et de qualite;
- **relation**: renforcer le lien social, la reconnaissance et l appartenance.

Cette lecture est coherente avec la Self-Determination Theory mise en avant dans les revues de gamification et de motivation. Une inference importante pour CleanMyMap est la suivante: **plus les mecanismes sont perçus comme controles ou purement extrinseques, plus ils risquent d affaiblir la motivation durable**.

## Ce que les sources apportent

### Open Badges

Les specifications Open Badges sont utiles pour structurer les distinctions du site:

- un badge doit etre associe a des **criteres** clairs;
- il peut inclure des **preuves** et des metadonnees verifiables;
- il est **portable** et partageable;
- il peut etre verifie par le consommateur du badge.

Implication pour CleanMyMap:

- chaque badge doit pouvoir expliquer pourquoi il existe;
- la preuve doit etre lisible dans le produit;
- les badges doivent etre credibles, pas decoratifs.

### ORCA

ORCA met en avant:

- le **self-claiming**;
- les **prerequis**;
- les **peer endorsements**;
- les **qualified reviews**;
- des badges qui peuvent aussi ouvrir des droits d usage.

Implication pour CleanMyMap:

- certaines reconnaissances peuvent etre auto-proclamees puis valides par preuve;
- les profils fiables peuvent debloquer des fonctions de revue ou de mentorat;
- la reconnaissance entre pairs est plus saine qu un classement brut.

### BadgeOS

BadgeOS est surtout utile comme reference de design fonctionnel:

- badges;
- steps / achievements;
- nominations et review;
- systeme d engagement extensible;
- integration de badges dans des pages ou parcours existants.

Implication pour CleanMyMap:

- les badges doivent vivre dans le parcours, pas dans un silo;
- l obtention doit etre lisible par etapes;
- la reconnaissance doit pouvoir etre reutilisee dans plusieurs ecrans.

### OpenVolunteerPlatform et Coalesce

Ces deux projets rappellent que le vrai sujet est la **gestion de benevoles**, pas le jeu:

- recrutement;
- onboarding;
- planification;
- communication;
- cartes et rapports;
- suivi d activite;
- role-based access.

Implication pour CleanMyMap:

- la gamification doit servir la coordination et la retention;
- les objectifs ludiques doivent rester secondaires par rapport a l utilite terrain;
- les cartes, les formulaires et les retours d impact restent le coeur du produit.

### Recherche sur la motivation benevole

La litterature sur la motivation benevole montre que l engagement varie selon:

- le contexte local;
- la culture;
- le type d activite;
- le niveau d autonomie laisse au volontaire;
- le besoin de reconnaissance sociale.

Implication pour CleanMyMap:

- il faut des boucles de motivation contextuelles, pas une formule universelle;
- les objectifs doivent pouvoir varier selon le profil, la zone, ou le rythme de contribution;
- la reconnaissance sociale doit rester sobre et non invasive.

## Principes de design recommandes

### Faire

- privilegier la progression personnelle au classement;
- afficher des badges explicites, avec criteres visibles;
- donner un retour immediat apres une action utile;
- proposer un prochain petit objectif;
- valoriser la regularite et la qualite;
- montrer l impact concret plutot que le score abstrait;
- permettre le partage volontaire des badges;
- utiliser des objectifs collectifs de zone ou d equipe;
- ouvrir des statuts de confiance pour les contributeurs reguliers.

### Eviter

- leaderboard public comme mecanique principale;
- competition entre individus comme coeur du produit;
- recompenses aleatoires ou type loot;
- perte de points ou penalites trop visibles;
- badges trop nombreux sans sens;
- objectifs opaques;
- notifications poussees trop frequentes;
- comparaison sociale permanente;
- mecanismes qui poussent a declarer plus vite au lieu de declarer mieux.

## Architecture ludique recommandee pour CleanMyMap

### Progression

- progression personnelle non agressive;
- niveau calcule a partir de l XP et de la qualite;
- blocage possible si les prerequis ne sont pas respectes;
- barre de progression vers le prochain palier;
- mention explicite du niveau potentiel et du niveau courant.

### Badges

- badges one-shot pour les premieres etapes;
- badges de regularite pour les contributions repetees;
- badges de confiance pour les profils fiables;
- badges de territoire pour la couverture locale;
- badges de qualite pour la fiabilite des donnees;
- badges collectifs pour l action de groupe.

### Objectifs

- **one-shot**: premiere action validee, premiere action collective, premier badge de confiance;
- **uniformes**: objectif mensuel simple, check-in de participation, quota de retours;
- **infinis**: une meme logique qui continue a monter en paliers, avec un badge qui evolue graphiquement et change de nom a chaque seuil important; exemples: niveaux, regularite sur plusieurs mois, seuils de qualite, role de mentor.

## Regles concretement recommandees

### Contrainte produit temporaire (prioritaire)

- pour l instant, **interdiction de proposer ou coder des objectifs globaux ou communautaires**;
- la gamification active doit rester centree sur les **donnees utilisateur individuelles** (niveau, progression, qualite, regularite personnelle, badges personnels);
- les classements autorises doivent rester des lectures de profil (ex: niveau utilisateur), sans introduire de cible collective a atteindre.

### Regle de base

Une recompense doit toujours repondre a la question:

**qu a fait la personne, comment est-ce verifie, et pourquoi cela compte pour la communaute ?**

### Regle de visibilite

- la progression reste visible au niveau personnel;
- le classement global n est jamais la seule interface de valeur;
- les details de badge et les preuves doivent etre consultables.

### Regle de confiance

- une distinction ne doit pas etre accordee sans criteres stables;
- un badge doit etre defendable devant un humain;
- les roles plus avancés doivent etre restreints a des profils qualifies.

### Regle de transparence

- informer systématiquement l'utilisateur quand l'action qu'il s'apprête à faire (ou vient de faire) sur le site lui apporte de l'XP ou des badges.

### Regle de sobriete

- un seul prochain objectif visible suffit dans la plupart des ecrans;
- l interface doit rester calme;
- chaque feedback doit etre bref et utile.

## Hypotheses produit a tester

Les hypotheses suivantes sont des inférences produit a valider sur le terrain:

- les benevoles reviennent davantage si la progression est personnelle et utile;
- les badges lisibles augmentent la comprehension du parcours;
- la reconnaissance par les pairs augmente la retention plus qu un score numerique;
- des objectifs mensuels simples fonctionnent mieux que des mecanismes trop riches;
- la transparence des criteres renforce la confiance.

## Recommandation d implementation prioritaire

### Phase 1

- clarifier les badges existants avec criteres, preuves et seuils;
- rendre visible le niveau potentiel et le niveau courant;
- ajouter un bloc de retour post-action: merci, impact, prochain pas.

### Phase 2

- introduire des badges de confiance et de mentorat;
- permettre des reconnaissances par les pairs ou validateurs;
- structurer les objectifs mensuels et les objectifs de zone.

### Phase 3

- brancher des objectifs infinis par palier;
- personnaliser les objectifs selon l historique;
- experimenter des feedbacks de groupe plutot qu un leaderboard classique.

## Inventaire des surfaces

Pour une vue operative complete des surfaces a gamifier et de leur type principal, consulter:

- [gamification-inventory.md](./gamification-inventory.md)

## Sources externes

- [Open Badges FAQ](https://openbadges.org/about/faq)
- [Open Badges Build](https://openbadges.org/build)
- [1EdTech/openbadges-specification](https://github.com/1EdTech/openbadges-specification)
- [ORCA - Open Recognition Community App](https://github.com/skybridgeskills/orca)
- [BadgeOS](https://github.com/opencredit/badgeos)
- [OpenVolunteerPlatform](https://github.com/aerogear/OpenVolunteerPlatform)
- [Coalesce](https://github.com/FederationOfTech/Coalesce)
- [Self-Determination Theory and Workplace Outcomes](https://www.mdpi.com/2076-328X/14/6/428)
- [Gamification and health/wellbeing review](https://pmc.ncbi.nlm.nih.gov/articles/PMC6096297/)
- [Knowledge Mapping of Volunteer Motivation](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2022.883150/full)

## Note de lecture

Les recommandations ci-dessus combinent:

- des informations directement tirees des sources;
- et des inférences produit adaptees a CleanMyMap.

Autrement dit, les sources n imposent pas une solution unique. Elles donnent surtout un cadre pour construire une gamification **utile, verifiable, sobre et non competitive**.
