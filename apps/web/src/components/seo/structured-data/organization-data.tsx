// Structured data for organization and local business schemas
import { JsonLd } from "./json-ld-wrapper";
import { resolvePublicContactEmail } from "@/lib/email-config";

export function OrganizationJsonLd() {
  const contactEmail = resolvePublicContactEmail() ?? "contact@cleanmymap.fr";
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "CleanMyMap",
    url: "https://cleanmymap.fr",
    logo: "https://cleanmymap.fr/brand/nouveau-logo.svg",
    description:
      "Plateforme citoyenne de depollution urbaine, d'action ecologique et de developpement durable a Paris et en France. Coordination benevoles, mutualisation resultats, valorisation dechets.",
    sameAs: [
      "https://twitter.com/cleanmymap",
      "https://github.com/cleanmymap",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      email: contactEmail,
      contactType: "Customer Service",
    },
    areaServed: {
      "@type": "Country",
      name: "France",
    },
    serviceType: "Citizen participation platform",
    keywords: "depollution, ecologie, developpement durable, benevolat, action citoyenne, nettoyage urbain, coordination, partenariat, impact terrain, valorisation dechets",
  };

  return <JsonLd id="json-ld-organization" data={data} />;
}

export function LocalBusinessJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "CleanMyMap",
    image: "https://cleanmymap.fr/brand/nouveau-logo.svg",
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

  return <JsonLd id="json-ld-local-business" data={data} />;
}
