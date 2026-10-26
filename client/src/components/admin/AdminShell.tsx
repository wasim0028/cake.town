"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarHeart,
  ChefHat,
  ExternalLink,
  FolderTree,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Package,
  ShoppingBag,
  Star,
  Ticket,
  Users,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Wordmark } from "@/components/layout/Wordmark";
import { ThemeToggle } from "@/components/layout/Theme";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { toast, useAuth } from "@/lib/stores";
import styles from "./AdminShell.module.css";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/kitchen", label: "Kitchen list", icon: ChefHat },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/classes", label: "Classes", icon: CalendarHeart },
  { href: "/admin/coupons", label: "Coupons", icon: Ticket },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/messages", label: "Messages", icon: Mail },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const { user, status, setUser } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const messages = useQuery({
    queryKey: ["admin", "messages", "count"],
    queryFn: () => api.get<{ open: number }>("/admin/messages?handled=false&limit=1"),
    enabled: user?.role === "admin",
    refetchInterval: 60_000,
  });
  // New orders waiting to be started. Polled so the shop hears about an order within ~30s.
  const placed = useQuery({
    queryKey: ["admin", "orders", "placed-count"],
    queryFn: () => api.get<{ total: number }>("/admin/orders?status=placed&limit=1"),
    enabled: user?.role === "admin",
    refetchInterval: 30_000,
    refetchIntervalInBackground: true,
  });
  const newCount = placed.data?.total ?? 0;
  const seen = useRef<number | null>(null);
  useEffect(() => {
    if (placed.data === undefined) return;
    if (seen.current !== null && newCount > seen.current) {
      const n = newCount - seen.current;
      toast(n === 1 ? "New order received" : `${n} new orders received`, { tone: "success", body: "Open Orders to start baking." });
    }
    seen.current = newCount;
  }, [placed.data, newCount]);
  useEffect(() => {
    // Show the waiting count in the browser tab, e.g. "(2) Orders · caketown admin".
    const base = document.title.replace(/^\(\d+\) /, "");
    document.title = newCount ? `(${newCount}) ${base}` : base;
  }, [newCount, pathname]);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (status === "signed-out") router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [status, router, pathname]);

  if (status === "unknown" || status === "signed-out") {
    return (
      <div className={styles.gate}>
        <Skeleton height={40} width={240} />
      </div>
    );
  }
  if (user?.role !== "admin") {
    return (
      <div className={styles.gate}>
        <h1>Admins only</h1>
        <p className="muted">You&rsquo;re signed in as {user?.email}, which isn&rsquo;t an admin account.</p>
        <Button href="/">Back to the shop</Button>
      </div>
    );
  }

  const active = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));
  const signOut = async () => {
    await api.post("/auth/logout").catch(() => undefined);
    setUser(null);
    router.push("/");
  };

  return (
    <div className={styles.shell}>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <aside className={styles.side} data-open={open || undefined}>
        <div className={styles.brand}>
          <Link href="/admin" aria-label="caketown admin home">
            <Wordmark />
          </Link>
          <span className={styles.badge}>Admin</span>
          <button className={styles.close} onClick={() => setOpen(false)} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>
        <nav aria-label="Admin">
          <ul role="list" className={styles.nav}>
            {NAV.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link href={href} aria-current={active(href) ? "page" : undefined}>
                  <Icon size={18} aria-hidden />
                  <span>{label}</span>
                  {href === "/admin/orders" && newCount > 0 && (
                    <span className={styles.count} aria-label={`${newCount} new`}>
                      {newCount}
                    </span>
                  )}
                  {href === "/admin/messages" && (messages.data?.open ?? 0) > 0 && (
                    <span className={styles.count} aria-label={`${messages.data!.open} unread`}>
                      {messages.data!.open}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className={styles.foot}>
          <Link href="/" target="_blank" className={styles.footLink}>
            <ExternalLink size={16} aria-hidden /> View the shop
          </Link>
          <div className={styles.footRow}>
            <span className="small muted">{user.name}</span>
            <ThemeToggle />
            <button className={styles.icon} onClick={signOut} aria-label="Sign out" title="Sign out">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
      {open && <div className={styles.scrim} onClick={() => setOpen(false)} />}
      <div className={styles.main}>
        <header className={styles.topbar}>
          <button className={styles.icon} onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <Wordmark />
        </header>
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}
