// Structured data for organization and local business schemas
import { JsonLd } from "./json-ld-wrapper";

export function OrganizationJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "CleanMyMap",
    url: "https://cleanmymap.fr",
    logo: "https://cleanmymap.fr/brand/nouveau-logo.png",
    description:
      "Plateforme citoyenne de depollution urbaine, d'action ecologique et de developpement durable a Paris et en France. Coordination benevoles, mutualisation resultats, valorisation dechets.",
    sameAs: [
      "https://twitter.com/cleanmymap",
      "https://github.com/cleanmymap",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      email: "maxence.drm@gmail.com",
      contactType: "Customer Service",
    },
    areaServed: {
      "@type": "Country",
      name: "France",
    },
    serviceType: "Citizen participation platform",
    keywords: "depollution, ecologie, developpement durable, benevolat, action citoyenne, nettoyage urbain, coordination, partenariat, impact terrain, valorisation dechets",
  };

  return <JsonLd data={data} />;
}

export function LocalBusinessJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "CleanMyMap",
    image: "https://cleanmymap.fr/brand/nouveau-logo.png",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Paris",
      addressCountry: "FR",
    },
    areaServed: {
      "@type": "City",
      name: "Paris",
    },
    serviceType: "Environmental cleanup platform",
    description:
      "Plateforme citoyenne de nettoyage urbain et de depollution a Paris.",
  };

  return <JsonLd data={data} />;
}
