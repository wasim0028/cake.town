"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { User } from "@caketown/shared";

/* ---------- auth ---------- */

interface AuthState {
  user: User | null;
  status: "unknown" | "signed-in" | "signed-out";
  setUser: (user: User | null) => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  status: "unknown",
  setUser: (user) => set({ user, status: user ? "signed-in" : "signed-out" }),
}));

/* ---------- cart ----------
 * Guests keep their cart in the browser; it is merged into their account cart when they
 * sign in (phase C wires that to the API). Prices here are for display only: the server
 * recalculates everything at checkout.
 */

export interface CartItem {
  key: string;
  productId: string;
  variantId: string;
  slug: string;
  name: string;
  category: string;
  variantLabel: string;
  unitPrice: number; // paise
  quantity: number;
  eggless?: boolean;
  message?: string;
  image?: string;
}

interface CartState {
  items: CartItem[];
  open: boolean;
  /** Increments on every add so the cart icon can play its bump. */
  bumpKey: number;
  add: (item: Omit<CartItem, "key" | "quantity">, quantity?: number) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  setOpen: (open: boolean) => void;
}

const lineKey = (i: Pick<CartItem, "variantId" | "eggless" | "message">) => `${i.variantId}|${i.eggless ? 1 : 0}|${i.message ?? ""}`;

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      open: false,
      bumpKey: 0,
      add: (item, quantity = 1) =>
        set((s) => {
          const key = lineKey(item);
          const existing = s.items.find((i) => i.key === key);
          const items = existing
            ? s.items.map((i) => (i.key === key ? { ...i, quantity: Math.min(20, i.quantity + quantity) } : i))
            : [...s.items, { ...item, key, quantity }];
          return { items, bumpKey: s.bumpKey + 1 };
        }),
      setQuantity: (key, quantity) =>
        set((s) => ({ items: s.items.map((i) => (i.key === key ? { ...i, quantity: Math.max(1, Math.min(20, quantity)) } : i)) })),
      remove: (key) => set((s) => ({ items: s.items.filter((i) => i.key !== key) })),
      clear: () => set({ items: [] }),
      setOpen: (open) => set({ open }),
    }),
    {
      name: "ct-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ items: s.items }),
    },
  ),
);

export const cartCount = (items: CartItem[]) => items.reduce((n, i) => n + i.quantity, 0);
export const cartSubtotal = (items: CartItem[]) => items.reduce((n, i) => n + i.unitPrice * i.quantity, 0);

/* ---------- toasts ---------- */

export interface Toast {
  id: number;
  title: string;
  body?: string;
  tone?: "default" | "success" | "error";
}

interface ToastState {
  toasts: Toast[];
  push: (t: Omit<Toast, "id">) => void;
  dismiss: (id: number) => void;
}

let toastId = 0;
export const useToasts = create<ToastState>((set) => ({
  toasts: [],
  push: (t) => {
    const id = ++toastId;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { ...t, id }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), 3800);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));

export const toast = (title: string, opts: Omit<Toast, "id" | "title"> = {}) => useToasts.getState().push({ title, ...opts });
