import { HeroCake } from "@/components/art/HeroCake";
import { Button } from "@/components/ui/Button";
import { HeroParallax } from "./HeroParallax";
import { NextSlot } from "./NextSlot";
import styles from "./Hero.module.css";

/**
 * The page's one big moment: the headline "rises" like dough (each line lifts while the
 * Fraunces SOFT and weight axes swell), and the truffle cake floats on its stand.
 */
export function Hero() {
  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <div className={`container ${styles.grid}`}>
        <div className={styles.copy}>
          <h1 id="hero-title" className={styles.title}>
            <span className={styles.line}>
              <span style={{ animationDelay: "80ms" }}>Fresh baked</span>
            </span>
            <span className={styles.line}>
              <span className={styles.accent} style={{ animationDelay: "220ms" }}>
                happiness
              </span>
            </span>
            <span className={styles.line}>
              <span style={{ animationDelay: "360ms" }}>delivered</span>
            </span>
          </h1>
          <p className={`lede ${styles.lede}`}>
            Cakes made to order, with bread and pastries out of the oven every morning. Choose a three-hour delivery slot and it
            arrives fresh.
          </p>
          <div className={styles.ctas}>
            <Button href="/shop/cakes" size="lg">
              Order a cake
            </Button>
            <Button href="/shop" size="lg" variant="secondary">
              See the full menu
            </Button>
          </div>
          <NextSlot />
        </div>
        <HeroParallax className={styles.art}>
          <HeroCake />
        </HeroParallax>
      </div>
    </section>
  );
}
