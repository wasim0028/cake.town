import { Hero } from "@/components/home/Hero";
import { Newsletter } from "@/components/home/Newsletter";
import { Bestsellers, Categories, Kitchen, TrustStrip } from "@/components/home/Sections";
import { getBestsellers, getCategories, getClasses } from "@/lib/server-api";

// Re-render at most every 2 minutes so stock and class seats stay fresh.
export const revalidate = 120;

export default async function HomePage() {
  const [bestsellers, categories, classes] = await Promise.all([getBestsellers(8), getCategories(), getClasses()]);
  return (
    <>
      <Hero />
      <TrustStrip />
      <Bestsellers products={bestsellers} />
      <Categories categories={categories} />
      <Kitchen classes={classes} />
      <Newsletter />
    </>
  );
}
