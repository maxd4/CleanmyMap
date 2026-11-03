# Inventaire des images Strava : provenance et limites

**Statut :** BENCHMARK. Images récupérées dans les visuels promotionnels de la fiche publique [Strava Android sur Google Play](https://play.google.com/store/apps/details?id=com.strava), vérifiées visuellement le 3 novembre 2026.

Les huit fichiers sont de vraies images de Strava dans sa communication produit, mais les téléphones sont intégrés à des compositions promotionnelles. Ce ne sont pas des captures intégrales de toutes les pages, et les éléments visibles ne suffisent pas à certifier les parcours complets. **Ne pas confondre image Strava et maquette CleanMyMap générée.**

Les images sont fournies pour consultation interne et comparaison UX. Aucune autorisation de republication de ces images dans un dépôt public n'a été vérifiée. Elles sont donc des captures locales non versionnées ; les guides ne les présentent pas comme des assets publiés. Une publication ultérieure nécessiterait une permission adaptée ou une source sous licence compatible.

| Référence locale attendue | Ce qui est visuellement attesté | Fichiers des guides |
|---|---|---|
| `assets/strava/strava-feed-social.png` | Visuel « Share with friends » : carte d’activité, photo et actions sociales, dans une composition promotionnelle. | 01, 10 |
| `assets/strava/strava-record-gps.png` | Visuel « Track your workouts » : carte de suivi et contrôles d’enregistrement, dans une composition promotionnelle. | 03, 08, 21 |
| `assets/strava/strava-progression.png` | Visuel « Improve with personalized data » : vue de progression, graphique et indicateurs, dans une composition promotionnelle. | 09, 11, 17, 22 |
| `assets/strava/strava-communaute.png` | Visuel « Get motivated by the community » : contenu social et communauté, dans une composition promotionnelle. | 12, 13, 14, 15, 20 |
| `assets/strava/strava-partage.png` | Visuel « Turn your stats into stories » : carte de partage d’activité, dans une composition promotionnelle. | 18 |
| `assets/strava/strava-cartographie.png` | Visuel « Discover new routes » : carte, parcours et carte contextuelle, dans une composition promotionnelle. | 02, 06, 07, 16 |
| `assets/strava/strava-activite-connectee.png` | Visuel « Sync with your devices » : carte d’activité et statistiques, dans une composition promotionnelle. | 05 |
| `assets/strava/strava-activite-structuree.png` | Visuel « Lift it. Log it. See your gains. » : détail de session et métriques, dans une composition promotionnelle. | 04, 19 |

## Captures locales non versionnées

Les huit fichiers ci-dessus peuvent être conservés pour une consultation locale dans `apps/mobile/design-reference/assets/strava/`, mais ce dossier est ignoré par Git et ne doit pas être présenté comme une publication du dépôt. Sur un clone propre, consulter les [sources officielles](#sources-primaires-complémentaires) et les fiches de chaque guide ; l'absence du fichier local est un manque explicite, pas une capture inventée.

Les références complémentaires distinguent les captures officielles, les sources qui décrivent seulement un contrat d'interface et les captures tierces anciennes. Elles restent soumises aux mêmes vérifications de droits et de provenance.

## Sources primaires complémentaires

- [Google Play Strava](https://play.google.com/store/apps/details?id=com.strava)
- [Strava : enregistrer une activité](https://support.strava.com/fr/articles/15402137-comment-enregistrer-une-activite-sur-strava)
- [Strava : affichage des activités](https://support.strava.com/fr/articles/15401943-affichage-des-activites)
- [Strava : clubs sur mobile](https://support.strava.com/fr/articles/15401837-les-clubs-sur-l-appli-mobile)
- [Strava : profil](https://support.strava.com/fr/articles/15402175-votre-page-profil-strava)
- [Strava : paramètres Android](https://support.strava.com/fr/articles/15402004-parametres-de-l-application-android)
- [Strava : conditions d'utilisation](https://www.strava.com/legal/terms?hl=en-GB)
- [Strava : politique d'utilisation acceptable](https://www.strava.com/legal/acceptable_use?hl=en-GB)

## Captures directes encore souhaitables

Pour améliorer la fidélité future, remplacer les visuels promotionnels par des captures directes et récentes de l’application Strava prises avec l’autorisation appropriée, notamment **notifications, discussion, signalement (sans équivalent exact), fin d’enregistrement et paramètres**. Une image approchante ne doit jamais être qualifiée de capture exacte.
