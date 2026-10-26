import { Hero } from "@/components/home/Hero";
import { Newsletter } from "@/components/home/Newsletter";
import { Bestsellers, Categories, Kitchen, Testimonials, TrustStrip } from "@/components/home/Sections";
import { bakeryJsonLd, JsonLd } from "@/components/seo/JsonLd";
import { getBestsellers, getCategories, getClasses, getLatestReviews } from "@/lib/server-api";

export const metadata = { alternates: { canonical: "/" } };

// Re-render at most every 2 minutes so stock and class seats stay fresh.
export const revalidate = 120;

export default async function HomePage() {
  const [bestsellers, categories, classes, reviews] = await Promise.all([getBestsellers(8), getCategories(), getClasses(), getLatestReviews()]);
  return (
    <>
      <JsonLd data={bakeryJsonLd()} />
      <Hero />
      <TrustStrip />
      <Bestsellers products={bestsellers} />
      <Categories categories={categories} />
      <Testimonials reviews={reviews} />
      <Kitchen classes={classes} />
      <Newsletter />
    </>
  );
}
