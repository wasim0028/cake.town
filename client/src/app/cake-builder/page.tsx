import type { Metadata } from "next";
import { CakeBuilder } from "@/components/builder/CakeBuilder";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { getProduct } from "@/lib/server-api";

export const metadata: Metadata = {
  title: "Design a cake",
  description: "Choose the shape, size, sponge, frosting and toppings, add a message, and watch your cake come together before you order.",
  alternates: { canonical: "/cake-builder" },
};

export const revalidate = 60;

/** The builder is powered by the "Design Your Own Cake" product (sizes, sponges, eggless price). */
const BUILDER_SLUG = "design-your-own-cake";

export default async function CakeBuilderPage() {
  const product = await getProduct(BUILDER_SLUG);
  return (
    <>
      <PageHeader
        title="Design your cake"
        intro="Six quick choices. Your cake takes shape as you pick, and the price updates with every change."
        crumbs={[{ href: "/cake-builder", label: "Design a cake" }]}
        compact
      />
      {product?.isCustomizable ? (
        <CakeBuilder product={product} />
      ) : (
        <div className="container" style={{ paddingBottom: "6rem" }}>
          <p className="lede">The cake designer is taking a short break. Our ready-to-order cakes can still be personalised with a message.</p>
          <div style={{ marginTop: "1.5rem" }}>
            <Button href="/shop/cakes">See the cakes</Button>
          </div>
        </div>
      )}
    </>
  );
}
