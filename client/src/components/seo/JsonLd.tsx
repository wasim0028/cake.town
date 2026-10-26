import { abs, SITE } from "@/lib/site";

/** Structured data for search engines. `<` is escaped so text can never close the script tag. */
export function JsonLd({ data }: { data: object | object[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export const breadcrumbs = (items: { name: string; path: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: abs(it.path) })),
});

/** The shop as a local bakery, plus the site search box. Shown on the home page. */
export function bakeryJsonLd() {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Bakery",
      "@id": `${SITE.url}/#bakery`,
      name: SITE.name,
      description: SITE.description,
      url: SITE.url,
      logo: abs("/icon.svg"),
      image: abs("/opengraph-image"),
      email: SITE.email,
      ...(SITE.phone ? { telephone: SITE.phone } : {}),
      address: {
        "@type": "PostalAddress",
        ...(SITE.address ? { streetAddress: SITE.address } : {}),
        addressLocality: SITE.city,
        ...(SITE.pincode ? { postalCode: SITE.pincode } : {}),
        addressCountry: "IN",
      },
      areaServed: SITE.city,
      priceRange: "₹₹",
      servesCuisine: ["Bakery", "Desserts"],
      currenciesAccepted: "INR",
      paymentAccepted: "Cash, UPI, Credit Card, Debit Card",
      openingHoursSpecification: [
        {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
          opens: "07:00",
          closes: "22:00",
        },
      ],
      hasMenu: abs("/shop"),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${SITE.url}/#website`,
      name: SITE.name,
      url: SITE.url,
      inLanguage: "en-IN",
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${SITE.url}/shop?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
  ];
}
