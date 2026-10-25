"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, ShoppingBag, User } from "lucide-react";
import { useEffect, useState } from "react";
import { cartCount, useAuth, useCart } from "@/lib/stores";
import { Drawer } from "@/components/ui/Drawer";
import { ThemeToggle } from "./Theme";
import { Wordmark } from "./Wordmark";
import styles from "./Navbar.module.css";

const LINKS = [
  { href: "/shop", label: "Shop" },
  { href: "/shop/cakes", label: "Cakes" },
  { href: "/cake-builder", label: "Design a cake" },
  { href: "/classes", label: "Baking classes" },
  { href: "/about", label: "Our story" },
];

export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const items = useCart((s) => s.items);
  const bumpKey = useCart((s) => s.bumpKey);
  const setCartOpen = useCart((s) => s.setOpen);
  const user = useAuth((s) => s.user);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => setMenuOpen(false), [pathname]);

  const count = hydrated ? cartCount(items) : 0;
  const isActive = (href: string) => (href === "/shop" ? pathname === "/shop" : pathname.startsWith(href));

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className={styles.bar} data-scrolled={scrolled || undefined}>
        <div className={`container ${styles.inner}`}>
          <button
            type="button"
            className={styles.burger}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            data-open={menuOpen || undefined}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span />
            <span />
            <span />
          </button>

          <Link href="/" className={styles.brand} aria-label="caketown home">
            <Wordmark />
          </Link>

          <nav aria-label="Main" className={styles.nav}>
            <ul role="list">
              {LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className={styles.link} aria-current={isActive(l.href) ? "page" : undefined}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className={styles.actions}>
            <Link href="/shop?search=1" className={styles.icon} aria-label="Search the menu">
              <Search size={19} />
            </Link>
            <Link href={user ? "/account" : "/login"} className={`${styles.icon} ${styles.hideSm}`} aria-label={user ? "Your account" : "Sign in"}>
              <User size={19} />
            </Link>
            <span className={styles.hideSm}>
              <ThemeToggle />
            </span>
            <button
              id="cart-button"
              type="button"
              className={`${styles.icon} ${styles.cart}`}
              onClick={() => setCartOpen(true)}
              aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
            >
              <ShoppingBag size={20} />
              {count > 0 && (
                <span key={bumpKey} className={styles.badge} aria-hidden>
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} title="Menu" side="left">
        <nav aria-label="Mobile">
          <ul role="list" className={styles.mobileList}>
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={styles.mobileLink} aria-current={isActive(l.href) ? "page" : undefined}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className={styles.mobileFooter}>
          <Link href={user ? "/account" : "/login"} className={styles.mobileSecondary}>
            <User size={18} /> {user ? `Signed in as ${user.name.split(" ")[0]}` : "Sign in or create an account"}
          </Link>
          <div className={styles.mobileTheme}>
            <span>Theme</span>
            <ThemeToggle />
          </div>
        </div>
      </Drawer>
    </>
  );
}
