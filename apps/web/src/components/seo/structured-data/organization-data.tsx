// Structured data for organization and service schemas
import { JsonLd } from "./json-ld-wrapper";
import { env } from "@/lib/env";
import { resolvePublicContactEmail } from "@/lib/email-config";

const appUrl = env["NEXT_PUBLIC_APP_URL"] || "https://cleanmymap.fr";

export function OrganizationJsonLd() {
  const contactEmail = resolvePublicContactEmail() ?? "contact@cleanmymap.fr";
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "CleanMyMap",
    url: appUrl,
    logo: `${appUrl}/brand/nouveau-logo.svg`,
    description:
      "Plateforme citoyenne de dépollution urbaine en France. CleanMyMap aide à signaler les pollutions, organiser des cleanwalks et suivre l'impact des actions de terrain.",
    sameAs: [
      "https://instagram.com/cleanmymap.fr",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      email: contactEmail,
      contactType: "customer support",
    },
    areaServed: {
      "@type": "Country",
      name: "France",
    },
    serviceType: "Citizen participation platform",
    keywords: "dépollution urbaine, cleanwalk, action citoyenne, bénévolat, environnement, France",
  };

  return <JsonLd id="json-ld-organization" data={data} />;
}

export function LocalBusinessJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "CleanMyMap",
    url: appUrl,
    image: `${appUrl}/brand/nouveau-logo.svg`,
    areaServed: {
      "@type": "Country",
      name: "France",
    },
    serviceType: "Environmental cleanup platform",
    description:
      "Plateforme citoyenne de nettoyage urbain et de dépollution partout en France.",
  };

  return <JsonLd id="json-ld-local-business" data={data} />;
}
