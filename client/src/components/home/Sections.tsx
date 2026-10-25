import Link from "next/link";
import Image from "next/image";
import { Clock, EggOff, Truck } from "lucide-react";
import { DELIVERY, formatINR, type BakingClass, type Category, type Product } from "@caketown/shared";
import { CategoryArt } from "@/components/art/BakeArt";
import { Reveal } from "@/components/layout/Reveal";
import { ProductPlate } from "@/components/product/ProductPlate";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/primitives";
import styles from "./Sections.module.css";

/* ---------- three facts people ask about first ---------- */

export function TrustStrip() {
  const facts = [
    { icon: <Truck size={22} />, title: `Free delivery over ${formatINR(DELIVERY.freeAbove)}`, body: `${formatINR(DELIVERY.fee)} below that, in a 3-hour slot` },
    { icon: <EggOff size={22} />, title: "Eggless on request", body: "Most cakes can be made without eggs" },
    { icon: <Clock size={22} />, title: "Baked the same day", body: "Breads at 6 am, cakes when you order" },
  ];
  return (
    <section aria-label="Delivery and baking" className={styles.trust}>
      <ul role="list" className={`container ${styles.trustList}`}>
        {facts.map((f) => (
          <li key={f.title} className={styles.fact}>
            <span className={styles.factIcon} aria-hidden>
              {f.icon}
            </span>
            <span>
              <strong>{f.title}</strong>
              <span className={styles.factBody}>{f.body}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------- bestsellers ---------- */

export function Bestsellers({ products }: { products: Product[] }) {
  return (
    <section className="section" aria-labelledby="bestsellers">
      <div className="container">
        <SectionHeading
          id="bestsellers"
          title="Bestsellers"
          intro="What people order most. Every cake is baked after you order, so it reaches you the day it's made."
          action={
            <Button href="/shop" variant="secondary" size="sm">
              See the whole menu
            </Button>
          }
        />
        {products.length ? (
          <Reveal as="ul" role="list" className={styles.shelf}>
            {products.map((p, i) => (
              <li key={p.id} data-reveal-item>
                <ProductPlate product={p} priority={i < 4} />
              </li>
            ))}
          </Reveal>
        ) : (
          <div className={styles.unavailable}>
            <p>
              <strong>The menu isn&rsquo;t loading right now.</strong> Refresh in a moment, or{" "}
              <Link href="/contact" className="text-link">
                message us
              </Link>{" "}
              to order directly.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------- categories ---------- */

export function Categories({ categories }: { categories: Category[] }) {
  if (!categories.length) return null;
  return (
    <section className={`section ${styles.categoriesSection}`} aria-labelledby="categories">
      <div className="container">
        <SectionHeading id="categories" title="Browse the counter" />
        <Reveal as="ul" role="list" className={styles.categories}>
          {categories.map((c) => (
            <li key={c.id} data-reveal-item>
              <Link href={`/shop/${c.slug}`} className={styles.category}>
                <span className={styles.categoryPlate}>
                  <CategoryArt slug={c.slug} />
                </span>
                <span className={styles.categoryName}>{c.name}</span>
                <span className={styles.categoryCount}>{c.productCount ?? 0} on the menu</span>
              </Link>
            </li>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- the kitchen & baking classes ---------- */

const dateFmt = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

export function Kitchen({ classes }: { classes: BakingClass[] }) {
  const upcoming = classes
    .flatMap((c) => c.sessions.slice(0, 1).map((s) => ({ c, s })))
    .sort((a, b) => a.s.startsAt.localeCompare(b.s.startsAt))
    .slice(0, 3);

  return (
    <section className={styles.kitchen} aria-labelledby="kitchen">
      <div className={`container ${styles.kitchenGrid}`}>
        <Reveal className={styles.kitchenPhoto}>
          <Image
            src="/images/kitchen.webp"
            alt="Two bakers in our kitchen adding sugar flowers to a four-tier white wedding cake with orange ribbon"
            width={1080}
            height={720}
            sizes="(max-width: 860px) 100vw, 50vw"
          />
        </Reveal>
        <div className={styles.kitchenCopy}>
          <h2 id="kitchen">Bake it with us</h2>
          <p className={styles.kitchenLede}>
            Small weekend classes in our own kitchen, from a first decorated cake to laminated croissant dough. Everything you make
            goes home with you.
          </p>
          {upcoming.length > 0 && (
            <ul role="list" className={styles.sessions}>
              {upcoming.map(({ c, s }) => (
                <li key={s.id}>
                  <Link href={`/classes/${c.slug}`} className={styles.session}>
                    <span className={styles.sessionTitle}>{c.title}</span>
                    <span className={styles.sessionMeta}>
                      <time dateTime={s.startsAt}>{dateFmt.format(new Date(s.startsAt))}</time>
                      <span>{formatINR(c.price)}</span>
                      <span className={s.seatsLeft <= 3 ? styles.fewSeats : undefined}>
                        {s.seatsLeft === 0 ? "Full" : `${s.seatsLeft} seat${s.seatsLeft === 1 ? "" : "s"} left`}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Button href="/classes" variant="caramel" size="lg">
            See all classes
          </Button>
        </div>
      </div>
    </section>
  );
}
