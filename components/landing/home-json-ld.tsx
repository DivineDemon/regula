import { SUPPORT } from "@/lib/constants";
import { PLAN_CONFIGS, type PlanType } from "@/lib/plans";
import { getSiteUrl } from "@/lib/site-url";
import { LANDING_HERO_DESCRIPTION, LANDING_HERO_HEADLINE } from "./hero";

const PLAN_ORDER: PlanType[] = ["free", "starter", "growth", "enterprise"];

function buildHomepageGraph(baseNoSlash: string) {
  const orgId = `${baseNoSlash}/#organization`;
  const webId = `${baseNoSlash}/#website`;
  const appId = `${baseNoSlash}/#softwareapplication`;

  const offers = PLAN_ORDER.map((planType) => {
    const cfg = PLAN_CONFIGS[planType];
    return {
      "@type": "Offer" as const,
      name: cfg.name,
      price: String(cfg.price / 100),
      priceCurrency: "USD",
      url: `${baseNoSlash}/register`,
      description: cfg.whoItsFor,
    };
  });

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": orgId,
        name: "Regula",
        url: baseNoSlash,
        logo: {
          "@type": "ImageObject",
          url: `${baseNoSlash}/favicon.svg`,
        },
        slogan: LANDING_HERO_HEADLINE,
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "customer support",
          email: SUPPORT.email,
          availableLanguage: "English",
        },
      },
      {
        "@type": "WebSite",
        "@id": webId,
        name: "Regula",
        url: baseNoSlash,
        publisher: { "@id": orgId },
        inLanguage: "en-US",
      },
      {
        "@type": "SoftwareApplication",
        "@id": appId,
        name: "Regula",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web browser",
        description: LANDING_HERO_DESCRIPTION,
        url: `${baseNoSlash}/`,
        isAccessibleForFree: true,
        offers,
        provider: { "@id": orgId },
      },
    ],
  };
}

export function HomeJsonLd() {
  const origin = getSiteUrl();
  const baseNoSlash = origin.toString().replace(/\/+$/, "");
  const graph = buildHomepageGraph(baseNoSlash);
  const json = JSON.stringify(graph).replace(/</g, "\\u003c");

  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD is JSON.stringify output from server-only graph; `<` is escaped.
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
