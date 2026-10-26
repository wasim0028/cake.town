import type { Cart } from "@caketown/shared";
import { api } from "./api";
import { useCart, type CartItem } from "./stores";

/** Same as the website: copy the device cart into the account so the server prices it. */
export async function syncCartToServer(): Promise<{ cart: Cart; rejected: { item: CartItem; message: string }[] }> {
  const local = useCart.getState().items;
  const res = await api.put<{ cart: Cart; rejected: { index: number; message: string }[] }>("/cart", {
    items: local.map((i) => ({
      productId: i.productId,
      variantId: i.variantId,
      quantity: i.quantity,
      eggless: Boolean(i.eggless),
      ...(i.flavour ? { flavour: i.flavour } : {}),
      ...(i.message ? { message: i.message } : {}),
      ...(i.custom ? { custom: i.custom } : {}),
    })),
  });
  const rejected = res.rejected.map((r) => ({ item: local[r.index]!, message: r.message })).filter((r) => r.item);
  if (rejected.length) {
    const bad = new Set(rejected.map((r) => r.item.key));
    useCart.setState((s) => ({ items: s.items.filter((i) => !bad.has(i.key)) }));
  }
  return { cart: res.cart, rejected };
}
