import { Button } from "@/components/ui/Button";
import { NotFoundArt } from "./NotFoundArt";
import styles from "./not-found.module.css";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <section className={`container ${styles.wrap}`}>
      <NotFoundArt />
      <div>
        <h1>This page didn&rsquo;t rise</h1>
        <p className="lede">The link may be old or mistyped. The cakes are all still here, though.</p>
        <div className={styles.ctas}>
          <Button href="/shop">Go to the menu</Button>
          <Button href="/" variant="secondary">
            Back to the home page
          </Button>
        </div>
      </div>
    </section>
  );
}
