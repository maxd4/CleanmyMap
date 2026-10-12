# Transition de CleanMyMap vers une association loi 1901 relevant de l'ESS

> **État : PLAN, non exécuté.** Référence vérifiée le 12 octobre 2026 pour une association dont le siège est situé hors Alsace-Moselle.
>
> **Situation actuelle :** CleanMyMap est édité par une personne physique à titre non professionnel. Aucune association, société ou autre personne morale n'exploite encore le service. L'association, son RNA/SIRET, les conventions de transfert, les assurances et l'éventuelle qualité ESS **ne sont pas acquis**.
>
> **Portée :** feuille de route administrative, juridique, financière et applicative. Ce document n'est ni un jeu de statuts signé, ni un avis juridique, ni une autorisation d'effectuer une migration. Ne pas modifier les textes publics ni le runtime avant les jalons correspondants.

## 1. Objectif et principe de transition

Créer une association loi 1901 capable de développer et soutenir durablement CleanMyMap : prévention des déchets abandonnés, coordination de cleanwalks, sensibilisation, cartographie et restitution d'informations environnementales, coopération entre citoyens, associations et collectivités.

La loi du 31 juillet 2014 relative à l'économie sociale et solidaire (ESS), article 1, prévoit notamment : une finalité autre que le seul partage des bénéfices ; une gouvernance démocratique définie par les statuts ; une affectation majoritaire des excédents à l'activité et des réserves impartageables. Les associations font partie des formes juridiques du secteur. **L'agrément ESUS est une démarche distincte et facultative**, sans intérêt établi à ce stade. La qualité ESS n'est pas une preuve d'impact environnemental, un agrément d'intérêt général, une exonération fiscale ni une éligibilité automatique à un appel à projets.

**Stratégie privilégiée :** association dédiée, gouvernance collective réelle, logiciel open source conservé sous AGPL-3.0-only, transfert éventuel d'exploitation seulement après conventions et audit RGPD. Éviter de constituer une association pour un seul appel à projets si le fonctionnement collectif n'est pas souhaité.

Sources canoniques existantes : [état juridique](README.md), [vision / ESS cible](../product/vision-et-objectifs.md), [modèle économique non validé](../product/business-model.md), [méthodologie d'impact](../product/SCIENTIFIC_PROTOCOL.md). Elles continuent à faire foi pour leurs périmètres respectifs.

## 2. Décisions à prendre avant la déclaration (bloquantes)

| Sujet | Choix à arbitrer | Preuve de clôture |
| --- | --- | --- |
| Existence du projet collectif | Au moins deux fondateurs disponibles et réellement engagés ; rôles et temps consacrés | Accord des personnes et réunion préparatoire |
| Dénomination | Nom exact, sigle éventuel et disponibilité (RNA, INPI, domaine, usages existants) | Décision consignée ; aucun droit de marque supposé |
| Siège social | Commune et adresse autorisée ; domicile ou domiciliation avec justificatif lorsque demandé | Accord de domiciliation conservé hors Git |
| Objet et moyens | Environnement, bénévolat, outils numériques, pédagogie, données, partenariats ; éventuelles prestations accessoires | Projet de statuts relu |
| Gouvernance | Qui vote, qui représente et engage l'association, gestion des conflits d'intérêts et des dépenses | Statuts et règles de décision proposés |
| Patrimoine et logiciel | Distinguer droits d'auteur, marque, domaine, données, comptes cloud et matériel | Inventaire des titulaires et des conventions envisagées |
| Argent | Cotisations, dons, subventions, mécénat, éventuelles prestations, budget initial et frais réels | Budget de première année, même avec montants encore estimatifs |
| Activité terrain | Assurance RC, sécurité, autorisations éventuelles, photos, mineurs, gestion des déchets | Responsable désigné et procédure de vérification |
| Calendrier | Date de constitution, date de dépôt, besoins SIRET et délais des appels ciblés | Planning réaliste, sans antidater les actes |

**Décision structurante :** l'association ne doit pas devenir fictivement propriétaire de l'application ni responsable des données par un simple changement de nom. La personnalité morale naît dans le cadre des formalités de déclaration et de publicité, et les droits et obligations se traitent séparément.

## 3. Préparer les statuts et la gouvernance

### 3.1 Objet proposé (à relire avec les fondateurs)

> L'association a pour objet de contribuer à la protection de l'environnement, à la prévention des déchets abandonnés et à l'engagement citoyen. Elle peut notamment développer, maintenir et mettre à disposition des outils numériques ouverts, faciliter l'organisation d'actions collectives de dépollution, accompagner des acteurs locaux, diffuser des ressources pédagogiques et produire des restitutions environnementales transparentes. Elle peut conclure des partenariats et mener toute activité accessoire compatible avec cet objet, sans partage des excédents entre ses membres.

Cette rédaction est une base de travail et ne prouve pas à elle seule une reconnaissance d'intérêt général, d'utilité publique ou un droit à émettre des reçus fiscaux.

### 3.2 Clauses à arbitrer et documenter dans les statuts

- Dénomination, objet, durée, siège et modalités de déplacement du siège.
- Membres : fondateurs, actifs et éventuels partenaires ; admission, démission, radiation et possibilité de recours.
- Assemblée générale : information en amont, convocation, fréquence (recommandation : annuelle), quorum, majorité, procès-verbal et votes à distance.
- Droits de vote non conditionnés au montant des cotisations ou à une contribution technique : modèle conseillé « un membre votant, une voix », catégories et exceptions justifiées si nécessaire.
- Administration : président ou coprésidence, trésorier, éventuel secrétaire, durée et renouvellement des mandats ; délégation de signature documentée.
- Approbation des comptes, du budget, des dépenses majeures, des conventions avec dirigeants et des conflits d'intérêts (abstention du membre intéressé).
- Gestion non lucrative : excédents affectés à l'objet, non-distribution aux membres, réserves impartageables ; remboursement de frais sur justificatifs et rémunération éventuelle uniquement après examen juridique/fiscal.
- Modification des statuts, dissolution et affectation de l'actif net résiduel conformément aux lois applicables, de préférence à une autre structure d'intérêt collectif éligible, jamais au bénéfice personnel des membres.
- Règlement intérieur facultatif : modération de la communauté, délégations techniques, gestion des dépenses, sécurité terrain ; ne pas figer des paramètres applicatifs changeants dans les statuts.

Une association loi 1901 en régime général se fonde sur l'accord d'au moins deux personnes. Pour la déclaration, les statuts datés et signés sont exigés par **au moins deux dirigeants** figurant sur la liste déclarée. Le trio président/trésorier/secrétaire est pratique mais n'est pas imposé uniformément par la loi de 1901 : les statuts déterminent les organes.

**Point de vigilance fondateur :** assumer un rôle technique privilégié est compatible avec l'association, mais les décisions de gouvernance et les engagements financiers ne peuvent être confisqués par une seule personne. Une convention séparée peut encadrer la propriété intellectuelle du projet initial.

## 4. Informations légales à recueillir (dossier privé)

Ne jamais committer dans GitHub la liste nominative complète des dirigeants, leurs domiciles, signatures, justificatifs ou coordonnées personnelles.

| Information / pièce | Quand ? | Usage |
| --- | --- | --- |
| Nom complet de l'association, sigle, objet publiable | Avant l'AG constitutive | Statuts, déclaration et JOAFE |
| Adresse exacte du siège et adresse de gestion si différente | Avant dépôt | Greffe, publication au JOAFE ; vérifier l'exposition publique de l'adresse |
| Date et lieu de l'assemblée constitutive | Lors de l'AG | Procès-verbal et déclaration |
| Identité, fonction, profession, domicile et nationalité des dirigeants | Avant dépôt | Liste réglementaire transmise au greffe ; **dossier privé** |
| Statuts datés et signés par au moins deux dirigeants, avec noms, prénoms et fonctions | Après AG | Pièce du dossier de création |
| Procès-verbal de l'AG constitutive daté et signé par au moins un dirigeant | Après AG | Pièce du dossier de création |
| Mandat signé si une personne tierce dépose le dossier | Si applicable | Pouvoir de représentation |
| Accord de domiciliation / justificatifs demandés par banque ou partenaires | Selon cas | Domiciliation, ouverture bancaire |
| RNA, récépissé et témoin de publication au JOAFE | Après traitement | Preuve d'existence et démarches ultérieures |
| SIREN/SIRET et avis de situation Sirene | Si demande de subvention, emploi ou activité concernée | Contrats, financeurs et facturation éventuelle |
| Coordonnées bancaires au nom de l'association, habilités bancaires | Après constitution | Dépenses, recettes, subventions |
| Attestation d'assurance et responsabilités terrain | Avant activité sous portage associatif | Sécurité, partenaires et événements |
| Contrats et décisions d'AG sur exploitation, marque, logiciel, données et fournisseurs | Avant bascule | Sécurité juridique et RGPD |

**Ne pas inscrire de dates de naissance dans les pièces jointes à e-création (statuts, PV, mandat)** : le téléservice indique un risque de rejet. Ne jamais conserver dans le dépôt des spécimens de signatures, RIB, numéros personnels, pièces d'identité ou attestations privées.

## 5. Formalités de création dans l'ordre

### Phase A : constitution

- [ ] Décider avec les autres fondateurs du nom, siège, objet, cotisations éventuelles et organes de décision.
- [ ] Vérifier la disponibilité du nom et la permission de domiciliation.
- [ ] Relire et adopter les statuts ; définir les premiers dirigeants.
- [ ] Tenir l'assemblée constitutive ; consigner création, adoption des statuts, élections et pouvoirs de déclaration dans un PV signé.
- [ ] Préparer la liste réglementaire des dirigeants et, le cas échéant, le mandat.

### Phase B : déclaration / publication

- [ ] Déposer une déclaration au greffe du département du siège social par [e-création](https://www.service-public.fr/particuliers/vosdroits/R1757) ou autre voie officielle.
- [ ] Y renseigner nom, objet à publier, siège, adresse de gestion si différente, date de l'assemblée ; joindre PV, statuts, liste des dirigeants et mandat si nécessaire.
- [ ] Demander la publication gratuite au JOAFE lors de la déclaration.
- [ ] Récupérer et archiver le récépissé avec RNA (W suivi de neuf chiffres).
- [ ] Télécharger le témoin de publication au JOAFE et l'archiver. **Ne pas déclarer l'association opérationnellement constituée avant vérification des pièces et de la publication.**

La page officielle mentionne un récépissé normalement délivré dans les cinq jours suivant un dossier complet, avec des retards possibles. Ne pas en déduire une garantie de calendrier pour une candidature.

### Phase C : fonctionnement

- [ ] Si l'association veut demander des subventions, employer des salariés ou réalise une activité entraînant une immatriculation, demander SIREN/SIRET selon le motif via la procédure officielle [SIRET association](https://www.service-public.fr/particuliers/vosdroits/F34727) (par exemple Pôle Sirene Associations / Insee pour les subventions, Urssaf pour l'emploi). Le numéro RNA n'est pas un SIRET.
- [ ] Ouvrir un compte bancaire au nom de l'association ; nommer et limiter les signataires ; archiver les pièces hors dépôt.
- [ ] Définir un exercice comptable, budget prévisionnel, suivi des factures, justificatifs, notes de frais et validation des dépenses.
- [ ] Vérifier une assurance responsabilité civile appropriée et les modalités de sécurité selon la nature des actions.
- [ ] Tenir les décisions et comptes rendus d'assemblées, puis faire les déclarations obligatoires en cas de changement de dirigeants ou statuts.
- [ ] Mettre en place un calendrier de suivi annuel : AG, rapports, budget, contrats, assurances et obligations selon seuils atteints.

La création et la publication au JOAFE en régime général sont gratuites ; banque, assurance, comptabilité, domiciliation et conseil éventuel ne le sont pas nécessairement.

## 6. Financement, fiscalité et engagements

### Ressources envisagées, non acquises

- Cotisations, dons non fiscalisés automatiquement et contributions volontaires.
- Subventions de projet : chaque appel a ses propres conditions d'ancienneté, de territoire, de financement et de reporting.
- Mécénat / parrainage : distinguer contreparties et leur traitement fiscal.
- Prestations institutionnelles éventuelles : suivi de campagne, coordination, exports ou rapports, **sans vente de données personnelles ni privilège de modération acheté**.

Le [modèle économique](../product/business-model.md) est un **PLAN** : aucune volonté de payer, recette récurrente ou subvention n'est aujourd'hui acquise. Établir un budget à partir de coûts vérifiés, distinguer trésorerie et contributions en nature, et ne pas présenter le bénévolat comme de la trésorerie disponible.

### Contrôles avant encaissement

- [ ] Définir un processus de validation des dépenses, remboursement sur facture et prévention des conflits d'intérêts.
- [ ] Étudier la non-lucrativité fiscale, la gestion désintéressée et les impôts commerciaux si une activité payante apparaît ; association ne signifie pas exonération automatique.
- [ ] Vérifier l'éligibilité au mécénat fiscal ; si nécessaire solliciter un rescrit. **Aucun reçu fiscal ni réduction d'impôt annoncé sans fondement établi.**
- [ ] Vérifier les règles du paiement par prestataire, de la collecte externe et le titulaire légal des fonds avant tout changement sur OnParticipe ou Stripe.
- [ ] Prévoir une séparation comptable par convention/projet lorsque les financeurs l'exigent.

## 7. Transition des actifs et de l'exploitation de CleanMyMap

**Choix recommandé pour commencer : une convention écrite entre le créateur et l'association**, définissant une autorisation d'exploitation du service et les responsabilités respectives, sans cession globale implicite.

| Actif / droit | Situation actuelle ou à auditer | Décision à formaliser |
| --- | --- | --- |
| Code web, API, mobile, scripts | Code CleanMyMap sous AGPL-3.0-only ; auteurs et contributions à vérifier | L'association peut utiliser le code sous licence existante ; autorisations contractuelles supplémentaires seulement si utiles et juridiquement possibles |
| Contributions tierces et bibliothèques | Licences propres à chaque titulaire | Ne pas promettre une propriété exclusive ni changer les licences sans consentement |
| Nom CleanMyMap et logos | Identité visuelle réservée ; aucun dépôt de marque présumé | Licence de marque/nom explicite, durée, contrôle qualité et retrait éventuel ; examen INPI si pertinent |
| Domaine cleanmymap.fr | Titulaire du domaine à vérifier | Mandat d'utilisation, renouvellement, facturation, accès de secours ; transfert seulement décidé et tracé |
| Repo GitHub | Dépôt actuellement dans le compte du fondateur | Conserver ou transférer sous organisation après analyse des permissions, CI, secrets, webhooks et risques |
| Prestataires (Vercel, Supabase, Clerk, Resend, Stripe, PostHog, Sentry) | Comptes/contrats à inventorier | Titulaire de chaque contrat, facturation, DPA, accès administrateurs, récupération et plan de secours |
| Base utilisateurs, géolocalisations, photos, messages | Données personnelles non soumises à la licence open source | Désigner le responsable de traitement, déterminer une base légale et encadrer toute transmission à la nouvelle personne morale |
| Données de partenaires et jeux ouverts | Licences et conventions hétérogènes | Vérifier droits de réutilisation, transferts et clauses de partenariat ; ne jamais ouvrir la base entière par défaut |
| Financement existant | Flux de contribution documentés, qualification fiscale non finalisée | Examiner contrats, remboursements, traçabilité et destinataire réel des fonds |
| Matériel et dépenses historiques | Propriété et justificatifs non établis | Inventorier sans faire passer automatiquement des biens personnels à l'association |

### Convention fondateur / association : clauses minimales à faire relire

Parties et capacité de signature ; définition des éléments autorisés (logiciel, nom, logo, domaine, documentation) ; licence ou cession selon chaque actif ; gratuité ou contrepartie ; durée, territoire et résiliation ; maintenance et sécurité ; responsabilités et assurances ; traitements de données et contrats prestataires distincts ; évolution de l'application ; contributions externes ; sort des accès, actifs et données en cas de dissolution ; validation par l'organe compétent avec déport en cas de conflit d'intérêts.

**Éviter toute confusion :** la licence AGPL autorise déjà des usages du code soumis à ses conditions. Elle ne transfère pas la propriété du nom, du logo, du domaine, des comptes SaaS ou des données personnelles. La création d'une association ne transfère aucun de ces éléments automatiquement.

## 8. RGPD, sécurité et responsabilité sur le terrain

### Avant le changement d'exploitant ou responsable de traitement

- [ ] Cartographier les traitements réels : comptes Clerk, géolocalisation et cartes, signalements, participations, messagerie, photos, modération, paiements, analytics et emails.
- [ ] Documenter les catégories de personnes et données, finalités, bases légales, durées de conservation, sous-traitants, flux hors UE et gestion des droits.
- [ ] Qualifier la situation entre personne physique et association : maintien d'un responsable, substitution ou responsabilité conjointe selon les faits ; demander un avis adapté si incertain.
- [ ] Vérifier les conventions de sous-traitance (DPA) et les accords avec partenaires ; ne pas transférer/exporter les comptes utilisateurs « par défaut ».
- [ ] Préparer une information claire aux utilisateurs sur la nouvelle identité du responsable, les droits, finalités et destinataires ; évaluer les oppositions et le besoin d'un nouveau consentement suivant la base légale et les changements envisagés.
- [ ] Actualiser le registre des traitements et les procédures de demandes RGPD, incidents, accès, sauvegardes et effacement.
- [ ] Tester les comptes administrateurs, RLS, secrets, webhooks et flux d'emails avant toute bascule, puis conserver une voie de retour et des preuves de validation.

### Cleanwalks et bénévolat

- [ ] Distinguer les actions simplement référencées sur la plateforme de celles effectivement organisées sous la responsabilité de l'association.
- [ ] Déterminer par événement les besoins d'autorisation/déclaration d'occupation ou de rassemblement sur l'espace public, convention éventuelle avec la collectivité et responsabilité de l'organisateur.
- [ ] Formaliser consignes de sécurité : objets dangereux, déchets à risque, mineurs, circulation, EPI, collecte et exutoires, premiers secours, incidents.
- [ ] Vérifier couverture d'assurance et autorisations des prises de vue/diffusion ; ne pas assimiler une inscription sur le site à une décharge générale de responsabilité.
- [ ] Définir le protocole de conservation de preuves et la distinction **mesures / déclarations / proxys** selon le [protocole scientifique](../product/SCIENTIFIC_PROTOCOL.md).

## 9. Impacts à prévoir dans le dépôt et le service (aucun changement immédiat)

Les chemins ci-dessous sont des **cibles d'audit ou de changements futurs**, à confirmer contre le code au moment du chantier. Ne pas les modifier en anticipant une création non effective.

| Zone | Travail futur | Condition de déclenchement |
| --- | --- | --- |
| `documentation/legal/README.md` | Basculer le statut CURRENT, éditeur, représentants légaux et répartition des rôles | RNA + JOAFE vérifiés, convention d'exploitation signée et responsabilité réellement assumée |
| `documentation/legal/conditions-generales-utilisation.md` | Adapter les parties contractantes et responsabilités (association, organisateur, participants) | Exploitant et parcours validés |
| `documentation/legal/politique-confidentialite.md`, `politique-cookies.md`, `dsa-signalement-moderation.md` | Identité et contact du responsable, sous-traitants, modération et droits RGPD | Revue et éventuelle transition RGPD documentées |
| Pages publiques, mentions légales et emails transactionnels | Mettre à jour les informations exactes, RNA/SIRET lorsque pertinents, contact et représentation | Données officielles connues et responsabilités signées |
| `documentation/product/vision-et-objectifs.md` | Faire évoluer « association TARGET / ESS TARGET » seulement après preuve | Constitution + conformité gouvernance vérifiées |
| `documentation/product/business-model.md` et page financement | Définir encaissement par la bonne entité, budget et sources réelles ; supprimer toute ambiguïté sur les dons fiscaux | Comptabilité et contrats opérationnels |
| Web + mobile, auth/roles/admin | Vérifier séparation droits des membres de l'association, des organisateurs terrain et des administrateurs techniques ; ne pas créer de rôles sans besoin | Modèle de gouvernance et habilitations approuvés |
| Supabase, Clerk, Vercel, domaines, GitHub et autres SaaS | Audit d'accès, titulaires, sécurité, facturation et reprise ; transferts seulement si décidés | Contrats, DPA, inventaire et procédure de rollback |
| Outils de rapports / exports et parcours actions | Vérifier mentions, traces d'audit, usage partenaire et responsabilité d'organisation | Conventions terrain et bases légales validées |

**Invariants techniques :** conserver licence AGPL-3.0-only et droits des tiers, éviter migration de base de données ou nouvelle couche d'abstraction sans nécessité prouvée, respecter AuthN/AuthZ/RLS, garder les secrets privés, conserver les conventions de documentation route-first et vérifier tests de non-régression selon le périmètre réellement modifié.

Recherche de références lors de la future bascule : `rg -n "Maxence Deroome|personne physique|non professionnel|mentions légales|responsable du traitement|reçu fiscal|Stripe|OnParticipe" documentation apps`. Examiner les résultats avant tout remplacement, sans global search/replace aveugle.

## 10. Jalons, preuves d'avancement et interdictions

| Jalons | Conditions de sortie | Statut |
| --- | --- | --- |
| J0 : intention collective | Fondateurs identifiés, accord réel sur le fonctionnement ESS, coût prévisionnel | À faire |
| J1 : paquet de constitution | Nom/siège choisis, statuts et PV prêts, liste des dirigeants en dossier privé | À faire |
| J2 : immatriculation associative | Récépissé RNA et témoin JOAFE conservés | À faire |
| J3 : capacité à fonctionner | Banque, budget, gouvernance, assurance selon activités, SIRET si nécessaire | À faire |
| J4 : exploitation sécurisée | Conventions droits/actifs, fournisseurs, RGPD, responsabilité validées | À faire |
| J5 : bascule publique | Documents légaux et applications modifiés, contrôlés, puis déployés | À faire |
| J6 : preuve de fonctionnement ESS | PV d'AG, décisions, comptes, actions et résultats audités, suivi annuel | À faire |

**À ne pas faire avant J4 :** changer le titulaire affiché des contrats, transférer des données d'utilisateurs, migrer Stripe ou la facturation, présenter la future association comme éditrice ou collectrice des fonds. **À ne pas faire avant J2 :** annoncer RNA, publication JOAFE ou statut associatif accompli. **À ne jamais déduire de la seule création :** ESUS, intérêt général fiscal, autorisation de reçus fiscaux, exemption d'impôts commerciaux, financement obtenu.

### Dossier documentaire privé de constitution (hors dépôt public)

Prévoir des emplacements séparés et à accès limité pour : version signée des statuts, PV, liste des dirigeants, mandat, accord de domiciliation, récépissé RNA, témoin JOAFE, SIRET, banque/assurance, contrats fondateur/association, décisions et comptes, registres RGPD et conventions avec partenaires. Dans GitHub, ne conserver que des modèles anonymisés ou des références sans données privées.

## 11. Sources officielles et points à revérifier au dépôt

- [Loi n° 2014-856, article 1 (ESS)](https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000029314926/2026-06-08).
- [Service-Public : rédaction des statuts](https://www.service-public.fr/particuliers/vosdroits/F1120).
- [Service-Public : déclaration initiale, liste des pièces et publication JOAFE](https://www.service-public.fr/particuliers/vosdroits/F1119).
- [Service-Public : téléservice e-création](https://www.service-public.fr/particuliers/vosdroits/R1757).
- [Service-Public : SIRET pour une association (fiche vérifiée le 14 août 2026)](https://www.service-public.fr/particuliers/vosdroits/F34727).
- [Service-Public : gestion désintéressée](https://www.service-public.fr/particuliers/vosdroits/F31839).
- [CNIL : transparence et information des personnes](https://www.cnil.fr/fr/conformite-rgpd-information-des-personnes-et-transparence).
- [Service-Public : manifestations sur la voie publique](https://www.service-public.fr/particuliers/vosdroits/F21899).
- [Service-Public : régime fiscal des dons](https://www.service-public.fr/particuliers/vosdroits/F426).

**Avant d'exécuter :** revérifier les formulaires, pièces, règles fiscales, assurances et conventions à la date effective de création, et demander une revue juridique/fiscale proportionnée pour les conventions du fondateur, l'activité économique et la transition RGPD.
