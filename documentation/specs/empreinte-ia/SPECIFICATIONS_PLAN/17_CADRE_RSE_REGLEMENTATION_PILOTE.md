# Cadre entreprise/RSE et protocole de pilote CleanMyMap

**Statut : PLAN / DOCUMENTATION DE DÉCISION.** Date de recherche : 20 novembre 2026. Ce document accompagne les lots 14, 15 et 16. Il **n'est pas un avis juridique**, ni une preuve de conformité d'une entreprise, et ne remplace pas les sources CURRENT du dépôt.

## 1. Positionnement produit

**Salarié** : « Comprendre mon usage de l'IA, agir sur le terrain et faire reconnaître mes participations confirmées. »

**Entreprise** : « Mobiliser les équipes, documenter leurs actions locales et publier des bilans d'engagement traçables. »

**Partenaire / financeur** : « Relier les moyens engagés à des activités vérifiées, des résultats mesurés et des limites publiées. »

**Promesse exclue** : rendre l'empreinte numérique ou les émissions de l'entreprise nulles grâce à la collecte de mégots et de déchets. Une cleanwalk est un engagement territorial réel ; elle n'annule pas les émissions de l'IA. La couverture du défi IA est symbolique et scénarisée.

## 2. Cadres et niveaux de preuve

| Sujet | Fait général vérifié au 20/11/2026 | Application CleanMyMap |
| --- | --- | --- |
| BEGES France | Entreprises et autres organisations visées par l'article L.229-25 et textes applicables doivent publier périodiquement un bilan réglementaire et un plan de transition ; seuil classique de plus de 500 salariés en métropole, 250 en outre-mer, exceptions selon statut | Le rapport d'actions terrain ne remplace pas le BEGES, ni un calcul certifié de son Scope 3 |
| CSRD modifiée | Directive (UE) 2026/470 : périmètre européen révisé en particulier au-delà de 1 000 salariés ET 450 M€ de chiffre d'affaires net, sous réserve de transposition et d'exceptions | Le rapport CleanMyMap peut fournir des éléments documentaires, **pas** une déclaration ESRS complète ou auditable par défaut |
| VSME / Voluntary Standard | Les standards volontaires EFRAG visent les entreprises hors reporting obligatoire et la communication structurée à des partenaires | Référentiel de vocabulaire potentiellement utile, sans label « VSME conforme » automatique |
| Allégations environnementales | Directive (UE) 2024/825 : cadre renforcé contre les allégations non étayées, application prévue à partir du 27/09/2026 | Interdire toute annonce de neutralité obtenue par les seules actions terrain ou les proxies de mégots |
| Émissions évitées | GHG Protocol : comparer et déclarer séparément les émissions évitées hors inventaire | Conserver deux colonnes séparées, jamais un solde net IA moins cleanwalk |
| Don/mécénat fiscal | Éligibilité selon organisme bénéficiaire et opération, justificatifs fiscaux officiels ; un reçu fiscal ne peut être délivré que dans les conditions légales | Distinguer dons et prestations. CleanMyMap n'émet aucun reçu fiscal et ne qualifie pas une entreprise comme mécène éligible |
| Protection salariés | CNIL : collecte proportionnée et absence de surveillance disproportionnée ; le consentement employé peut ne pas être libre du fait du lien hiérarchique | Par défaut aucun accès employeur. Partage volontaire d'un dossier non assimilé à une base légale universelle pour des traitements RH |

Le statut exact d'une entreprise, la base légale des traitements et la publication d'un rapport doivent être revus dans leur contexte par les responsables habilités. **« Conforme BEGES/CSRD » = non prouvé sans audit adapté.**

### Sources primaires

- Ministère de la Transition écologique, dispositif BEGES : https://www.ecologie.gouv.fr/strategie-nationale-bas-carbone/entreprises
- Directive (UE) 2026/470, règles CSRD modifiées : https://eur-lex.europa.eu/eli/dir/2026/470
- EFRAG, standard volontaire et référence 2026 : https://knowledgehub.efrag.org/eng
- Commission européenne, directive 2024/825 : https://energy.ec.europa.eu/news/new-eu-rules-empower-consumers-green-transition-enter-force-2024-03-27_en
- GHG Protocol, émissions évitées : https://ghgprotocol.org/estimating-and-reporting-avoided-emissions
- CNIL, contrôle des salariés : https://www.cnil.fr/fr/controle-de-lactivite-des-personnes-employees
- CNIL, limites du consentement de salarié : https://cnil.fr/fr/assurer-que-le-traitement-est-licite
- Impôts, dons et réductions d'impôt : https://www.impots.gouv.fr/professionnel/dons-et-reduction-dimpot
- Impôts, déclaration et reçus : https://www.impots.gouv.fr/professionnel/declaration-des-dons-et-recus

## 3. Trois objets documentaires non interchangeables

1. **Attestation de participation** : preuve CleanMyMap d'une action et d'une part personnelle, avec provenance et révision. Peut être présentée à une hiérarchie sans aucune affectation à cette entreprise. Une attestation associative signée exige toujours un signataire habilité.
2. **Bilan d'organisation** : agrégat de présences librement partagées et/ou de quantités dont la structure est bénéficiaire effective. Il affiche séparément les actions organisées et les contributions qui lui sont affectées.
3. **Dossier financeur** : projet, activité, coûts et résultats, avec références des engagements et justificatifs ; aucun avantage fiscal ni neutralité carbone déduit automatiquement.

**Exemple correct** : « Une association a organisé une action de 100 kg. Une entreprise y a mobilisé 3 salariés dont 18 kg de parts personnelles ont été affectés à l'entreprise. Le total physique reste 100 kg. »

**Exemple incorrect** : « L'association a ramassé 100 kg et l'entreprise a ajouté 18 kg supplémentaires. »

**Autre situation correcte** : les 3 salariés peuvent choisir de partager leur participation avec leur entreprise tout en laissant les 18 kg à l'association. L'entreprise peut communiquer sur les 3 salariés participants mais pas revendiquer 18 kg affectés à elle.

## 4. Données indispensables, facultatives et interdites

| Type | Champs admissibles | Limites |
| --- | --- | --- |
| Participation | Action, date, présence finale confirmée, source/révision, titre partageable | Pas de présence supposée ni simple inscription |
| Collecte | Kg hors mégots et comptage de mégots personnel effectifs ; individual vs quote_part | Jamais une donnée `NA` convertie en zéro ni une quote_part déclarée pesée individuelle |
| Structure | Identité vérifiée, représentant autorisé, organisateur initial, bénéficiaire effectif, période | Un domaine e-mail ou une fiche annuaire ne prouve pas une délégation de pouvoir |
| Employeur | Actions et champs autorisés à être partagés ; rapport agrégé | Pas de lecture automatique du compte privé ni de classement de performance |
| IA professionnelle | Relevé d'usage professionnel licitement détenu et qualifié, séparé du privé | Pas d'import des comptes IA salariés par l'entreprise, pas de neutralisation par une cleanwalk |
| Financement | Promis, engagé, versé, dépensé, justifié, devise, preuve contrôlée | Pas de preuve d'impact déduite d'une facture seule ; pas de reçu fiscal délivré |

Pour les petits effectifs, protéger contre la réidentification par croisement (actions, dates, postes) : privilégier les totaux agrégés ou supprimer l'affichage plutôt que publier des participations nominatives sans autorisation.

## 5. MVP pilote avant déploiement commercial

**Cohorte pilote proposée (objectif, non preuve)** : 1 entreprise volontaire, 1 association organisatrice, 1 à 3 actions finalisées, une équipe de salariés avec participation réellement confirmée. Éviter de demander une intégration RH ou API d'usage IA au premier pilote.

**Parcours** :

1. Une association crée et finalise une action dans les workflows CURRENT ; les participations sont confirmées et les quantités individuelles ou quote_parts sont réconciliées puis figées conformément au futur lot 11.
2. Chaque salarié peut préparer une attestation (lot 14), décider de partager ou non son engagement et conserver sa part pour lui-même.
3. Si une entreprise souhaite une attribution de quantité, le salarié doit faire un choix explicite vers une structure vérifiée (lot 15). Sans transfert, l'organisateur reste bénéficiaire ; sans organisateur fiable, attribution non résolue.
4. Le responsable RSE vérifié obtient un bilan d'activité (lot 15), puis un dossier lisible pour son responsable ou financeur (lot 16).
5. Tous les participants peuvent retirer le partage hébergé. Les rapports déjà téléchargés demeurent des instantanés historiques avec date de validité contrôlable.

**Indicateurs de décision pour le pilote, sans objectifs chiffrés inventés** :

| Indicateur | Ce que l'on mesure | Signal d'échec |
| --- | --- | --- |
| Couverture des preuves | Part d'actions finalisées et de participations confirmées avec données fiables | Beaucoup de `NA`, mesures contestées, sources manquantes |
| Intégrité | Écart entre total physique, parts personnelles et partition bénéficiaires | Toute duplication positive ou réconciliation impossible |
| Consentement | Accords de partage réellement choisis, retraits honorés | Données accessibles hors audience autorisée |
| Utilité salarié | Utilisation volontaire de l'attestation par un salarié | Attestation incomprise, irréutilisable ou demandée sous contrainte |
| Utilité RSE | Rapport compris et réutilisable sans retouche trompeuse | Confusion entre présence, kg attribués et neutralisation CO₂ |
| Utilité financement | Justificatifs retracés et dossier utilisable par un interlocuteur externe | Statuts financiers flous, promesses présentées comme résultats |
| Coût plateforme | Temps de support, stockage de PDF, requêtes base, coûts d'exécution | Coût/complexité disproportionnés à l'usage réel |

**Décision de lancement B2B** : ne proposer une offre payante structurée qu'après preuve de valeur obtenue auprès d'une entreprise et d'une association, sécurité des accès démontrée, absence de double comptage et acceptation par un destinataire réel du rapport. Les prix, coûts unitaires, contrats et taux de conversion sont **non prouvés** à ce stade.

## 6. Stop de conception

Ne pas lancer de programme de certification, labels climat, crédits carbone, reçus fiscaux, classement RH, SSO entreprise, intégration de paie ou système de facturation complexe dans ces lots. Les études sur de futures prestations de cleanwalk, les modèles tarifaires et les offres grandes entreprises restent des décisions produit ultérieures fondées sur les résultats du pilote.