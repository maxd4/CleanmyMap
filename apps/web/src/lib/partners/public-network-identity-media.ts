/** Source-backed, public identity enrichment keyed exclusively by canonical IDs.
 * A verified postal address is not a verified geocode. */
export type NetworkPublicAddress = { label: string; municipality: string; nature: string; sourceUrl: string; checkedAt: string };
export type NetworkPublicLogo = { localPath: string; sourceUrl: string; checkedAt: string; usage: "own_brand" | "licensed" | "permission" };
const PUBLIC_NETWORK_ADDRESSES: Readonly<Record<string, NetworkPublicAddress>> = {
  "asso-zerowaste-france": { label: "1 passage Emma Calvé, 75012 Paris", municipality: "Paris 12e", nature: "Siège de l’association", sourceUrl: "https://www.zerowastefrance.org/politique-de-confidentialite/", checkedAt: "2026-11-25" },
  "asso-zerowaste-paris": { label: "1 passage Emma Calvé, 75012 Paris", municipality: "Paris 12e", nature: "Locaux hébergés à la Maison du Zéro Déchet", sourceUrl: "https://zerowasteparis.fr/adresses/", checkedAt: "2026-11-25" },
  "eco-organisme-citeo": { label: "2 bis avenue de Taillebourg, 75011 Paris", municipality: "Paris 11e", nature: "Siège déclaré dans les mentions légales actuelles", sourceUrl: "https://www.citeo.com/cgu-et-mentions-legales/", checkedAt: "2026-11-25" },
  "asso-megots-cyclope": { label: "Zone industrielle de la Petite Dimerie, 62310 Fruges", municipality: "Fruges", nature: "Siège déclaré ; site francilien distinct", sourceUrl: "https://www.cy-clope.com/mentions-legales/", checkedAt: "2026-11-25" },
  "collectivite-syctom": { label: "86 rue Regnault, 75013 Paris", municipality: "Paris 13e", nature: "Adresse postale institutionnelle", sourceUrl: "https://www.syctom-paris.fr/contacts.html", checkedAt: "2026-11-25" },
  "asso-maison-zero-dechet": { label: "1 passage Emma Calvé, 75012 Paris", municipality: "Paris 12e", nature: "Lieu d'activité", sourceUrl: "https://lamaisonduzerodechet.org/acces-horaires/", checkedAt: "2026-11-25" },
  "asso-1": { label: "7-9 place du Moulin de Cage, 93450 L’Île-Saint-Denis", municipality: "L’Île-Saint-Denis", nature: "Siège social déclaré", sourceUrl: "https://pikpik.org/mentions-legales/", checkedAt: "2026-11-25" },
};
const PUBLIC_NETWORK_LOGOS: Readonly<Record<string, NetworkPublicLogo>> = {
  cleanmymap: { localPath: "/brand/logo-court.png", sourceUrl: "https://github.com/maxd4/CleanmyMap/blob/main/apps/web/public/brand/logo-court.png", checkedAt: "2026-11-25", usage: "own_brand" },
};
export function getNetworkPublicLogo(id: string | null | undefined): NetworkPublicLogo | null {
  return id && Object.hasOwn(PUBLIC_NETWORK_LOGOS, id) ? PUBLIC_NETWORK_LOGOS[id] : null;
}
export function getNetworkPublicAddress(id: string | null | undefined): NetworkPublicAddress | null {
  return id && Object.hasOwn(PUBLIC_NETWORK_ADDRESSES, id) ? PUBLIC_NETWORK_ADDRESSES[id] : null;
}
