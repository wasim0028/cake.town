import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fromPaise } from "@caketown/shared";
import { PageHeader } from "@/components/layout/PageHeader";
import { Reveal } from "@/components/layout/Reveal";
import { DietaryTags, Gallery, ProductOptions } from "@/components/product/ProductDetail";
import { ProductPlate } from "@/components/product/ProductPlate";
import { Reviews } from "@/components/product/Reviews";
import { Button } from "@/components/ui/Button";
import { Stars } from "@/components/ui/form";
import { Accordion } from "@/components/ui/form";
import { getProduct, getRelated, getReviews } from "@/lib/server-api";
import styles from "./page.module.css";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) return { title: "Not found" };
  const description = p.shortDescription ?? p.description.slice(0, 155);
  return {
    title: p.name,
    description,
    alternates: { canonical: `/product/${p.slug}` },
    openGraph: { title: `${p.name} · caketown`, description, images: p.images[0] ? [{ url: p.images[0].url }] : undefined },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();
  const [related, reviews] = await Promise.all([getRelated(slug), getReviews(slug)]);

  const prices = product.variants.map((v) => v.price);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images.map((i) => i.url),
    brand: { "@type": "Brand", name: "caketown" },
    category: product.category.name,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "INR",
      lowPrice: fromPaise(Math.min(...prices)),
      highPrice: fromPaise(Math.max(...prices)),
      offerCount: product.variants.length,
      availability: product.variants.some((v) => v.inStock) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
    ...(product.rating.count
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: product.rating.average, reviewCount: product.rating.count } }
      : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className={`container ${styles.layout}`}>
        <Gallery product={product} />
        <div className={styles.info}>
          <PageHeader
            title={product.name}
            crumbs={[
              { href: "/shop", label: "Menu" },
              { href: `/shop/${product.category.slug}`, label: product.category.name },
              { href: `/product/${product.slug}`, label: product.name },
            ]}
            compact
          >
            {product.rating.count > 0 && (
              <a href="#reviews" className={styles.rating}>
                <Stars value={product.rating.average} /> {product.rating.average.toFixed(1)} · {product.rating.count} review{product.rating.count === 1 ? "" : "s"}
              </a>
            )}
            <DietaryTags product={product} />
            {product.shortDescription && <p className={styles.short}>{product.shortDescription}</p>}
          </PageHeader>

          {product.isCustomizable ? (
            <div className={styles.builderCta}>
              <p>This one is yours to design: choose the shape, sponge, frosting and toppings, and see it come together as you go.</p>
              <Button href="/cake-builder" size="lg">
                Open the cake designer
              </Button>
            </div>
          ) : (
            <ProductOptions product={product} />
          )}

          <div className={styles.details}>
            <Accordion
              items={[
                { q: "About this bake", a: <p>{product.description}</p> },
                {
                  q: "Freshness and storage",
                  a: (
                    <>
                      <p>Baked on the day of delivery. Cream cakes keep for 2 days in the fridge; take them out 30 minutes before serving.</p>
                      <p>Breads and pastries are best the same day. Refresh a croissant in a hot oven for 3 minutes.</p>
                    </>
                  ),
                },
                {
                  q: "Allergens",
                  a: <p>Made in a kitchen that handles wheat, eggs, milk, nuts and soy. Eggless items are baked on separate trays, but traces may remain.</p>,
                },
              ]}
            />
          </div>
        </div>
      </div>

      <div className="container">
        <Reviews slug={product.slug} initial={reviews} average={product.rating.average} count={product.rating.count} />
      </div>

      {related.length > 0 && (
        <section className={`container ${styles.related}`} aria-labelledby="related">
          <h2 id="related">You may also like</h2>
          <Reveal as="ul" role="list" className={styles.relatedGrid}>
            {related.slice(0, 4).map((p) => (
              <li key={p.id} data-reveal-item>
                <ProductPlate product={p} />
              </li>
            ))}
          </Reveal>
        </section>
      )}
    </>
  );
}
