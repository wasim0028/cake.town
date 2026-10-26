import Link from "next/link";
import type { ReactNode } from "react";
import { breadcrumbs, JsonLd } from "@/components/seo/JsonLd";
import styles from "./PageHeader.module.css";

export interface Crumb {
  href: string;
  label: string;
}

/** Title block for inner pages, with optional breadcrumbs (also emitted as structured data). */
export function PageHeader({ title, intro, crumbs, children, compact }: { title: ReactNode; intro?: ReactNode; crumbs?: Crumb[]; children?: ReactNode; compact?: boolean }) {
  return (
    <header className={`container ${styles.header}`} data-compact={compact || undefined}>
      {crumbs && crumbs.length > 0 && <JsonLd data={breadcrumbs([{ name: "Home", path: "/" }, ...crumbs.map((c) => ({ name: c.label, path: c.href }))])} />}
      {crumbs && crumbs.length > 0 && (
        <nav aria-label="Breadcrumb">
          <ol className={styles.crumbs}>
            <li>
              <Link href="/">Home</Link>
            </li>
            {crumbs.map((c, i) => (
              <li key={c.href}>
                {i === crumbs.length - 1 ? <span aria-current="page">{c.label}</span> : <Link href={c.href}>{c.label}</Link>}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <h1 className={styles.title}>{title}</h1>
      {intro && <p className={styles.intro}>{intro}</p>}
      {children}
    </header>
  );
}
