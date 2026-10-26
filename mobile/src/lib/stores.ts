import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CakeCustomization, User } from "@caketown/shared";

/* ---------- auth ---------- */

export const useAuth = create<{ user: User | null; status: "unknown" | "signed-in" | "signed-out"; setUser: (u: User | null) => void }>((set) => ({
  user: null,
  status: "unknown",
  setUser: (user) => set({ user, status: user ? "signed-in" : "signed-out" }),
}));

/* ---------- app preferences ---------- */

export const usePrefs = create<{ onboarded: boolean; pushAsked: boolean; set: (p: Partial<{ onboarded: boolean; pushAsked: boolean }>) => void }>()(
  persist((set) => ({ onboarded: false, pushAsked: false, set: (p) => set(p) }), {
    name: "ct-prefs",
    storage: createJSONStorage(() => AsyncStorage),
  }),
);

/* ---------- cart (same shape and rules as the website) ---------- */

export interface CartItem {
  key: string;
  productId: string;
  variantId: string;
  slug: string;
  name: string;
  category: string;
  variantLabel: string;
  unitPrice: number;
  quantity: number;
  eggless?: boolean;
  message?: string;
  flavour?: string;
  custom?: CakeCustomization;
  customSummary?: string;
  image?: string;
}

export const cartLineKey = (i: Pick<CartItem, "variantId" | "eggless" | "message" | "flavour" | "custom">) =>
  [i.variantId, i.eggless ? 1 : 0, i.message ?? "", i.flavour ?? "", i.custom ? JSON.stringify({ ...i.custom, toppings: [...i.custom.toppings].sort() }) : ""].join("|");

interface CartState {
  items: CartItem[];
  bumpKey: number;
  add: (item: Omit<CartItem, "key" | "quantity">, quantity?: number) => void;
  setQuantity: (key: string, q: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  replace: (items: CartItem[]) => void;
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      bumpKey: 0,
      add: (item, quantity = 1) =>
        set((s) => {
          const key = cartLineKey(item);
          const existing = s.items.find((i) => i.key === key);
          const items = existing
            ? s.items.map((i) => (i.key === key ? { ...i, quantity: Math.min(20, i.quantity + quantity) } : i))
            : [...s.items, { ...item, key, quantity }];
          return { items, bumpKey: s.bumpKey + 1 };
        }),
      setQuantity: (key, q) => set((s) => ({ items: s.items.map((i) => (i.key === key ? { ...i, quantity: Math.max(1, Math.min(20, q)) } : i)) })),
      remove: (key) => set((s) => ({ items: s.items.filter((i) => i.key !== key) })),
      clear: () => set({ items: [] }),
      replace: (items) => set({ items }),
    }),
    { name: "ct-cart", storage: createJSONStorage(() => AsyncStorage), partialize: (s) => ({ items: s.items }) },
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

let tid = 0;
export const useToasts = create<{ toasts: Toast[]; push: (t: Omit<Toast, "id">) => void; dismiss: (id: number) => void }>((set) => ({
  toasts: [],
  push: (t) => {
    const id = ++tid;
    set((s) => ({ toasts: [...s.toasts.slice(-1), { ...t, id }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), 3200);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));

export const toast = (title: string, opts: Omit<Toast, "id" | "title"> = {}) => useToasts.getState().push({ title, ...opts });
