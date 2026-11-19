import type {
  OifMembershipStatus,
  TerritoryAdminLevel,
  TerritoryCatalogGroup,
  TerritoryEntry,
} from "./territory-network-catalog";

const INSEE_COG_SOURCE = "https://www.insee.fr/fr/information/8740222";
const INSEE_COM_SOURCE = "https://www.insee.fr/fr/information/7929495";
const OIF_SOURCE = "https://www.francophonie.org/node/125";

function frRegion(
  code: string,
  nameFr: string,
  nameEn: string,
  group: "metropole" | "drom",
  representativePoint: [number, number],
): TerritoryEntry {
  return {
    id: `FR:REG:${code}`,
    code,
    nameFr,
    nameEn,
    adminLevel: "region_cog",
    countryCode: "FR",
    countryNameFr: "France",
    group,
    hasPermanentPopulation: true,
    representativePoint,
    sourceUrl: INSEE_COG_SOURCE,
  };
}

function frOutreMer(
  code: string,
  nameFr: string,
  nameEn: string,
  adminLevel: Extract<TerritoryAdminLevel, "collectivite_outre_mer" | "taaf_clipperton">,
  hasPermanentPopulation: boolean,
  representativePoint: [number, number] | null,
): TerritoryEntry {
  return {
    id: `FR:COM:${code}`,
    code,
    nameFr,
    nameEn,
    adminLevel,
    countryCode: "FR",
    countryNameFr: "France",
    group: "outre_mer",
    hasPermanentPopulation,
    representativePoint,
    sourceUrl: INSEE_COM_SOURCE,
  };
}

function oifTerritory(
  code: string,
  nameFr: string,
  nameEn: string,
  oifStatus: OifMembershipStatus,
  countryCode: string,
  countryNameFr: string,
  adminLevel: Extract<
    TerritoryAdminLevel,
    "oif_member" | "oif_associate" | "oif_observer" | "oif_subdivision"
  >,
  representativePoint: [number, number],
): TerritoryEntry {
  return {
    id: `OIF:${code}`,
    code,
    nameFr,
    nameEn,
    adminLevel,
    countryCode,
    countryNameFr,
    group: "francophonie",
    oifStatus,
    hasPermanentPopulation: true,
    representativePoint,
    sourceUrl: OIF_SOURCE,
  };
}

export const FRENCH_COG_REGIONS: readonly TerritoryEntry[] = [
  frRegion("01", "Guadeloupe", "Guadeloupe", "drom", [16.265, -61.551]),
  frRegion("02", "Martinique", "Martinique", "drom", [14.6415, -61.0242]),
  frRegion("03", "Guyane", "French Guiana", "drom", [3.9339, -53.1258]),
  frRegion("04", "La Réunion", "Réunion", "drom", [-21.1151, 55.5364]),
  frRegion("06", "Mayotte", "Mayotte", "drom", [-12.8275, 45.1662]),
  frRegion("11", "Île-de-France", "Île-de-France", "metropole", [48.8566, 2.3522]),
  frRegion("24", "Centre-Val de Loire", "Centre-Val de Loire", "metropole", [47.7516, 1.6751]),
  frRegion("27", "Bourgogne-Franche-Comté", "Bourgogne-Franche-Comté", "metropole", [47.2805, 4.9994]),
  frRegion("28", "Normandie", "Normandy", "metropole", [49.1829, -0.3707]),
  frRegion("32", "Hauts-de-France", "Hauts-de-France", "metropole", [50.4801, 2.7937]),
  frRegion("44", "Grand Est", "Grand Est", "metropole", [48.6998, 6.1878]),
  frRegion("52", "Pays de la Loire", "Pays de la Loire", "metropole", [47.7633, -0.3299]),
  frRegion("53", "Bretagne", "Brittany", "metropole", [48.202, -2.9326]),
  frRegion("75", "Nouvelle-Aquitaine", "Nouvelle-Aquitaine", "metropole", [45.7087, 0.6269]),
  frRegion("76", "Occitanie", "Occitanie", "metropole", [43.8927, 3.2828]),
  frRegion("84", "Auvergne-Rhône-Alpes", "Auvergne-Rhône-Alpes", "metropole", [45.4471, 4.3853]),
  frRegion("93", "Provence-Alpes-Côte d'Azur", "Provence-Alpes-Côte d'Azur", "metropole", [43.9352, 6.0679]),
  frRegion("94", "Corse", "Corsica", "metropole", [42.0396, 9.0129]),
];

export const FRENCH_OVERSEAS_COLLECTIVITIES: readonly TerritoryEntry[] = [
  frOutreMer("975", "Saint-Pierre-et-Miquelon", "Saint Pierre and Miquelon", "collectivite_outre_mer", true, [46.8852, -56.3159]),
  frOutreMer("977", "Saint-Barthélemy", "Saint Barthélemy", "collectivite_outre_mer", true, [17.9, -62.8333]),
  frOutreMer("978", "Saint-Martin", "Saint Martin", "collectivite_outre_mer", true, [18.0708, -63.0501]),
  frOutreMer("984", "Terres australes et antarctiques françaises", "French Southern and Antarctic Lands", "taaf_clipperton", false, null),
  frOutreMer("986", "Wallis-et-Futuna", "Wallis and Futuna", "collectivite_outre_mer", true, [-13.7688, -177.1561]),
  frOutreMer("987", "Polynésie française", "French Polynesia", "collectivite_outre_mer", true, [-17.6797, -149.4068]),
  frOutreMer("988", "Nouvelle-Calédonie", "New Caledonia", "collectivite_outre_mer", true, [-20.9043, 165.618]),
  frOutreMer("989", "Île de Clipperton", "Clipperton Island", "taaf_clipperton", false, null),
];

export const OIF_AND_FRANCOPHONE_SUBDIVISIONS: readonly TerritoryEntry[] = [
  // Subdivisions francophones pertinentes (Belgique, Canada, Suisse)
  oifTerritory("BE-WAL", "Wallonie", "Wallonia", "membre", "BE", "Belgique", "oif_subdivision", [50.4674, 4.872]),
  oifTerritory("BE-BRU", "Bruxelles-Capitale", "Brussels-Capital", "membre", "BE", "Belgique", "oif_subdivision", [50.8503, 4.3517]),
  oifTerritory("CA-QC", "Québec", "Quebec", "membre", "CA", "Canada", "oif_subdivision", [46.8139, -71.208]),
  oifTerritory("CA-NB", "Nouveau-Brunswick", "New Brunswick", "membre", "CA", "Canada", "oif_subdivision", [46.5653, -66.4619]),
  oifTerritory("CH-GE", "Genève (canton)", "Geneva (canton)", "membre", "CH", "Suisse", "oif_subdivision", [46.2044, 6.1432]),
  oifTerritory("CH-VD", "Vaud (canton)", "Vaud (canton)", "membre", "CH", "Suisse", "oif_subdivision", [46.5197, 6.6323]),
  oifTerritory("CH-NE", "Neuchâtel (canton)", "Neuchâtel (canton)", "membre", "CH", "Suisse", "oif_subdivision", [46.992, 6.9311]),
  oifTerritory("CH-JU", "Jura (canton)", "Jura (canton)", "membre", "CH", "Suisse", "oif_subdivision", [47.3667, 7.35]),
  oifTerritory("CH-FR", "Fribourg (canton)", "Fribourg (canton)", "membre", "CH", "Suisse", "oif_subdivision", [46.8065, 7.1619]),
  oifTerritory("CH-VS", "Valais (canton)", "Valais (canton)", "membre", "CH", "Suisse", "oif_subdivision", [46.2331, 7.3606]),
  // États et gouvernements membres de l'OIF (hors France déjà recensée)
  oifTerritory("AD", "Andorre", "Andorra", "membre", "AD", "Andorre", "oif_member", [42.5063, 1.5218]),
  oifTerritory("AL", "Albanie", "Albania", "membre", "AL", "Albanie", "oif_member", [41.3275, 19.8187]),
  oifTerritory("AM", "Arménie", "Armenia", "membre", "AM", "Arménie", "oif_member", [40.1792, 44.4991]),
  oifTerritory("BE", "Belgique (Fédération Wallonie-Bruxelles)", "Belgium (Wallonia-Brussels)", "membre", "BE", "Belgique", "oif_member", [50.8503, 4.3517]),
  oifTerritory("BF", "Burkina Faso", "Burkina Faso", "membre", "BF", "Burkina Faso", "oif_member", [12.3714, -1.5197]),
  oifTerritory("BG", "Bulgarie", "Bulgaria", "membre", "BG", "Bulgarie", "oif_member", [42.6977, 23.3219]),
  oifTerritory("BI", "Burundi", "Burundi", "membre", "BI", "Burundi", "oif_member", [-3.3731, 29.9189]),
  oifTerritory("BJ", "Bénin", "Benin", "membre", "BJ", "Bénin", "oif_member", [6.3703, 2.3912]),
  oifTerritory("CA", "Canada", "Canada", "membre", "CA", "Canada", "oif_member", [45.4215, -75.6972]),
  oifTerritory("CD", "République démocratique du Congo", "Democratic Republic of the Congo", "membre", "CD", "RD Congo", "oif_member", [-4.4419, 15.2663]),
  oifTerritory("CF", "République centrafricaine", "Central African Republic", "membre", "CF", "Centrafrique", "oif_member", [4.3947, 18.5582]),
  oifTerritory("CG", "République du Congo", "Republic of the Congo", "membre", "CG", "Congo", "oif_member", [-4.2634, 15.2429]),
  oifTerritory("CH", "Suisse", "Switzerland", "membre", "CH", "Suisse", "oif_member", [46.948, 7.4474]),
  oifTerritory("CI", "Côte d'Ivoire", "Ivory Coast", "membre", "CI", "Côte d'Ivoire", "oif_member", [6.8276, -5.2893]),
  oifTerritory("CM", "Cameroun", "Cameroon", "membre", "CM", "Cameroun", "oif_member", [3.848, 11.5021]),
  oifTerritory("CV", "Cap-Vert", "Cabo Verde", "membre", "CV", "Cap-Vert", "oif_member", [14.933, -23.5133]),
  oifTerritory("DJ", "Djibouti", "Djibouti", "membre", "DJ", "Djibouti", "oif_member", [11.5721, 43.1456]),
  oifTerritory("DM", "Dominique", "Dominica", "membre", "DM", "Dominique", "oif_member", [15.415, -61.371]),
  oifTerritory("EG", "Égypte", "Egypt", "membre", "EG", "Égypte", "oif_member", [30.0444, 31.2357]),
  oifTerritory("GA", "Gabon", "Gabon", "membre", "GA", "Gabon", "oif_member", [0.4162, 9.4673]),
  oifTerritory("GN", "Guinée", "Guinea", "membre", "GN", "Guinée", "oif_member", [9.6412, -13.5784]),
  oifTerritory("GQ", "Guinée équatoriale", "Equatorial Guinea", "membre", "GQ", "Guinée équatoriale", "oif_member", [3.7504, 8.7371]),
  oifTerritory("GR", "Grèce", "Greece", "membre", "GR", "Grèce", "oif_member", [37.9838, 23.7275]),
  oifTerritory("GW", "Guinée-Bissau", "Guinea-Bissau", "membre", "GW", "Guinée-Bissau", "oif_member", [11.8037, -15.1804]),
  oifTerritory("HT", "Haïti", "Haiti", "membre", "HT", "Haïti", "oif_member", [18.5944, -72.3074]),
  oifTerritory("KH", "Cambodge", "Cambodia", "membre", "KH", "Cambodge", "oif_member", [11.5564, 104.9282]),
  oifTerritory("KM", "Comores", "Comoros", "membre", "KM", "Comores", "oif_member", [-11.7172, 43.2473]),
  oifTerritory("LA", "Laos", "Laos", "membre", "LA", "Laos", "oif_member", [17.9757, 102.6331]),
  oifTerritory("LB", "Liban", "Lebanon", "membre", "LB", "Liban", "oif_member", [33.8938, 35.5018]),
  oifTerritory("LC", "Sainte-Lucie", "Saint Lucia", "membre", "LC", "Sainte-Lucie", "oif_member", [14.0101, -60.9875]),
  oifTerritory("LU", "Luxembourg", "Luxembourg", "membre", "LU", "Luxembourg", "oif_member", [49.6116, 6.1319]),
  oifTerritory("MA", "Maroc", "Morocco", "membre", "MA", "Maroc", "oif_member", [34.0209, -6.8416]),
  oifTerritory("MC", "Monaco", "Monaco", "membre", "MC", "Monaco", "oif_member", [43.7384, 7.4246]),
  oifTerritory("MD", "Moldavie", "Moldova", "membre", "MD", "Moldavie", "oif_member", [47.0105, 28.8638]),
  oifTerritory("MG", "Madagascar", "Madagascar", "membre", "MG", "Madagascar", "oif_member", [-18.8792, 47.5079]),
  oifTerritory("MK", "Macédoine du Nord", "North Macedonia", "membre", "MK", "Macédoine du Nord", "oif_member", [41.9973, 21.428]),
  oifTerritory("ML", "Mali", "Mali", "membre", "ML", "Mali", "oif_member", [12.6392, -8.0029]),
  oifTerritory("MR", "Mauritanie", "Mauritania", "membre", "MR", "Mauritanie", "oif_member", [18.0735, -15.9582]),
  oifTerritory("MU", "Maurice", "Mauritius", "membre", "MU", "Maurice", "oif_member", [-20.1609, 57.5012]),
  oifTerritory("NE", "Niger", "Niger", "membre", "NE", "Niger", "oif_member", [13.5116, 2.1254]),
  oifTerritory("RO", "Roumanie", "Romania", "membre", "RO", "Roumanie", "oif_member", [44.4268, 26.1025]),
  oifTerritory("RW", "Rwanda", "Rwanda", "membre", "RW", "Rwanda", "oif_member", [-1.9441, 30.0619]),
  oifTerritory("SC", "Seychelles", "Seychelles", "membre", "SC", "Seychelles", "oif_member", [-4.6191, 55.4513]),
  oifTerritory("SN", "Sénégal", "Senegal", "membre", "SN", "Sénégal", "oif_member", [14.7167, -17.4677]),
  oifTerritory("ST", "Sao Tomé-et-Principe", "São Tomé and Príncipe", "membre", "ST", "Sao Tomé-et-Principe", "oif_member", [0.3365, 6.7273]),
  oifTerritory("TD", "Tchad", "Chad", "membre", "TD", "Tchad", "oif_member", [12.1348, 15.0557]),
  oifTerritory("TG", "Togo", "Togo", "membre", "TG", "Togo", "oif_member", [6.1375, 1.2123]),
  oifTerritory("TN", "Tunisie", "Tunisia", "membre", "TN", "Tunisie", "oif_member", [36.8065, 10.1815]),
  oifTerritory("VN", "Vietnam", "Vietnam", "membre", "VN", "Vietnam", "oif_member", [21.0278, 105.8342]),
  oifTerritory("VU", "Vanuatu", "Vanuatu", "membre", "VU", "Vanuatu", "oif_member", [-17.7333, 168.3273]),
  // Membres associés
  oifTerritory("CY", "Chypre", "Cyprus", "associe", "CY", "Chypre", "oif_associate", [35.1856, 33.3823]),
  oifTerritory("GH", "Ghana", "Ghana", "associe", "GH", "Ghana", "oif_associate", [5.6037, -0.187]),
  oifTerritory("QA", "Qatar", "Qatar", "associe", "QA", "Qatar", "oif_associate", [25.2854, 51.531]),
  oifTerritory("RS", "Serbie", "Serbia", "associe", "RS", "Serbie", "oif_associate", [44.7866, 20.4489]),
  oifTerritory("XK", "Kosovo", "Kosovo", "associe", "XK", "Kosovo", "oif_associate", [42.6629, 21.1655]),
  oifTerritory("AE", "Émirats arabes unis", "United Arab Emirates", "associe", "AE", "Émirats arabes unis", "oif_associate", [24.4539, 54.3773]),
  // Observateurs (sélection représentative OIF)
  oifTerritory("AR", "Argentine", "Argentina", "observateur", "AR", "Argentine", "oif_observer", [-34.6037, -58.3816]),
  oifTerritory("AT", "Autriche", "Austria", "observateur", "AT", "Autriche", "oif_observer", [48.2082, 16.3738]),
  oifTerritory("BA", "Bosnie-Herzégovine", "Bosnia and Herzegovina", "observateur", "BA", "Bosnie-Herzégovine", "oif_observer", [43.8563, 18.4131]),
  oifTerritory("CR", "Costa Rica", "Costa Rica", "observateur", "CR", "Costa Rica", "oif_observer", [9.9281, -84.0907]),
  oifTerritory("CZ", "Tchéquie", "Czechia", "observateur", "CZ", "Tchéquie", "oif_observer", [50.0755, 14.4378]),
  oifTerritory("DO", "République dominicaine", "Dominican Republic", "observateur", "DO", "République dominicaine", "oif_observer", [18.4861, -69.9312]),
  oifTerritory("EE", "Estonie", "Estonia", "observateur", "EE", "Estonie", "oif_observer", [59.437, 24.7536]),
  oifTerritory("GE", "Géorgie", "Georgia", "observateur", "GE", "Géorgie", "oif_observer", [41.7151, 44.8271]),
  oifTerritory("HR", "Croatie", "Croatia", "observateur", "HR", "Croatie", "oif_observer", [45.815, 15.9819]),
  oifTerritory("HU", "Hongrie", "Hungary", "observateur", "HU", "Hongrie", "oif_observer", [47.4979, 19.0402]),
  oifTerritory("IE", "Irlande", "Ireland", "observateur", "IE", "Irlande", "oif_observer", [53.3498, -6.2603]),
  oifTerritory("KR", "Corée du Sud", "South Korea", "observateur", "KR", "Corée du Sud", "oif_observer", [37.5665, 126.978]),
  oifTerritory("LT", "Lituanie", "Lithuania", "observateur", "LT", "Lituanie", "oif_observer", [54.6872, 25.2797]),
  oifTerritory("LV", "Lettonie", "Latvia", "observateur", "LV", "Lettonie", "oif_observer", [56.9496, 24.1052]),
  oifTerritory("ME", "Monténégro", "Montenegro", "observateur", "ME", "Monténégro", "oif_observer", [42.4304, 19.2594]),
  oifTerritory("MX", "Mexique", "Mexico", "observateur", "MX", "Mexique", "oif_observer", [19.4326, -99.1332]),
  oifTerritory("MZ", "Mozambique", "Mozambique", "observateur", "MZ", "Mozambique", "oif_observer", [-25.9692, 32.5732]),
  oifTerritory("PL", "Pologne", "Poland", "observateur", "PL", "Pologne", "oif_observer", [52.2297, 21.0122]),
  oifTerritory("SK", "Slovaquie", "Slovakia", "observateur", "SK", "Slovaquie", "oif_observer", [48.1486, 17.1077]),
  oifTerritory("SI", "Slovénie", "Slovenia", "observateur", "SI", "Slovénie", "oif_observer", [46.0569, 14.5058]),
  oifTerritory("TH", "Thaïlande", "Thailand", "observateur", "TH", "Thaïlande", "oif_observer", [13.7563, 100.5018]),
  oifTerritory("UA", "Ukraine", "Ukraine", "observateur", "UA", "Ukraine", "oif_observer", [50.4501, 30.5234]),
  oifTerritory("UY", "Uruguay", "Uruguay", "observateur", "UY", "Uruguay", "oif_observer", [-34.9011, -56.1645]),
];

export const TERRITORY_NETWORK_CATALOG: readonly TerritoryEntry[] = [
  ...FRENCH_COG_REGIONS,
  ...FRENCH_OVERSEAS_COLLECTIVITIES,
  ...OIF_AND_FRANCOPHONE_SUBDIVISIONS,
];

export const TERRITORY_GROUP_ORDER: readonly TerritoryCatalogGroup[] = [
  "metropole",
  "drom",
  "outre_mer",
  "francophonie",
];
