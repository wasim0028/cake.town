"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarHeart, Heart, LogOut, MapPin, Package, User } from "lucide-react";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { useRequireAuth } from "@/lib/hooks";
import { toast, useAuth } from "@/lib/stores";
import styles from "./AccountShell.module.css";

const NAV = [
  { href: "/account", label: "Profile", icon: <User size={18} /> },
  { href: "/account/orders", label: "Orders", icon: <Package size={18} /> },
  { href: "/account/wishlist", label: "Favourites", icon: <Heart size={18} /> },
  { href: "/account/addresses", label: "Addresses", icon: <MapPin size={18} /> },
  { href: "/account/bookings", label: "Classes", icon: <CalendarHeart size={18} /> },
];

export function AccountShell({ children }: { children: ReactNode }) {
  const { user, ready } = useRequireAuth();
  const pathname = usePathname();
  const router = useRouter();
  const setUser = useAuth((s) => s.setUser);

  const signOut = async () => {
    await api.post("/auth/logout").catch(() => undefined);
    setUser(null);
    toast("Signed out");
    router.push("/");
    router.refresh();
  };

  const active = (href: string) => (href === "/account" ? pathname === "/account" : pathname.startsWith(href));

  return (
    <div className={`container ${styles.shell}`}>
      <aside className={styles.side}>
        <div className={styles.hello}>
          {ready && user ? (
            <>
              <span className={styles.avatar} aria-hidden>
                {user.name.charAt(0)}
              </span>
              <div>
                <p className={styles.name}>{user.name}</p>
                <p className="muted small">{user.email}</p>
              </div>
            </>
          ) : (
            <Skeleton height={48} />
          )}
        </div>
        <nav aria-label="Account">
          <ul role="list" className={styles.nav}>
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} aria-current={active(n.href) ? "page" : undefined}>
                  {n.icon}
                  {n.label}
                </Link>
              </li>
            ))}
            <li>
              <button type="button" onClick={signOut}>
                <LogOut size={18} />
                Sign out
              </button>
            </li>
          </ul>
        </nav>
      </aside>
      <div className={styles.main}>{ready ? children : <Skeleton height={300} />}</div>
    </div>
  );
}
