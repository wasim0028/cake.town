import Link from "next/link";
import { Wordmark } from "./Wordmark";
import styles from "./Footer.module.css";

const COLUMNS = [
  {
    title: "Shop",
    links: [
      { href: "/shop/cakes", label: "Cakes" },
      { href: "/shop/breads", label: "Breads" },
      { href: "/shop/pastries", label: "Pastries" },
      { href: "/shop/cupcakes", label: "Cupcakes" },
      { href: "/shop/cookies", label: "Cookies" },
    ],
  },
  {
    title: "caketown",
    links: [
      { href: "/about", label: "Our story" },
      { href: "/classes", label: "Baking classes" },
      { href: "/blog", label: "Recipes & notes" },
      { href: "/contact", label: "Contact us" },
    ],
  },
  {
    title: "Help",
    links: [
      { href: "/help#delivery", label: "Delivery slots & areas" },
      { href: "/account/orders", label: "Track an order" },
      { href: "/help#faq", label: "Questions" },
      { href: "/account", label: "Your account" },
    ],
  },
];

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.top}`}>
        <div className={styles.brand}>
          <Link href="/" aria-label="caketown home">
            <Wordmark size="lg" tone="inverse" />
          </Link>
          <p>Cakes made to order, bread from the oven every morning, and delivery in a three-hour slot you choose.</p>
          <p className={styles.hours}>
            Kitchen open 7 am – 10 pm, every day
            <br />
            Questions about an order? <a href="mailto:hello@caketown.in">hello@caketown.in</a>
          </p>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title} className={styles.col}>
            <h2 className={styles.colTitle}>{col.title}</h2>
            <ul role="list">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className={`container ${styles.bottom}`}>
        <p>© {new Date().getFullYear()} caketown</p>
        <p>Pay by UPI, card or cash on delivery</p>
        <ul role="list" className={styles.legal}>
          <li>
            <Link href="/privacy">Privacy</Link>
          </li>
          <li>
            <Link href="/terms">Terms</Link>
          </li>
          <li>
            <a href="https://instagram.com" rel="noopener noreferrer" target="_blank">
              Instagram
            </a>
          </li>
        </ul>
      </div>
    </footer>
  );
}
