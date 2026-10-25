/**
 * "Design your own cake" options. Shared by the API (which prices the cake) and the apps
 * (which show the same prices live), so they can never disagree. Prices in paise.
 */
export const CAKE_SHAPES = [
  { id: "round", label: "Round", price: 0 },
  { id: "square", label: "Square", price: 0 },
  { id: "heart", label: "Heart", price: 10_000 },
] as const;

export const CAKE_FROSTINGS = [
  { id: "fresh-cream", label: "Fresh cream", price: 0, color: "#F7EBD6" },
  { id: "buttercream", label: "Vanilla buttercream", price: 3_000, color: "#FBEFDD" },
  { id: "chocolate-ganache", label: "Chocolate ganache", price: 5_000, color: "#3A2117" },
  { id: "cream-cheese", label: "Cream cheese", price: 8_000, color: "#F3E9DA" },
] as const;

export const CAKE_TOPPINGS = [
  { id: "berries", label: "Fresh berries", price: 9_000 },
  { id: "chocolate-shards", label: "Chocolate shards", price: 4_000 },
  { id: "sprinkles", label: "Rainbow sprinkles", price: 2_000 },
  { id: "macarons", label: "Mini macarons", price: 12_000 },
  { id: "flowers", label: "Sugar flowers", price: 10_000 },
  { id: "gold-leaf", label: "Edible gold leaf", price: 15_000 },
] as const;

export const MAX_TOPPINGS = 4;

export type CakeShapeId = (typeof CAKE_SHAPES)[number]["id"];
export type CakeFrostingId = (typeof CAKE_FROSTINGS)[number]["id"];
export type CakeToppingId = (typeof CAKE_TOPPINGS)[number]["id"];

export interface CakeCustomization {
  shape: CakeShapeId;
  frosting: CakeFrostingId;
  toppings: CakeToppingId[];
}

/** Extra cost of the chosen shape, frosting and toppings, per cake (paise). */
export function customCakeExtra(c: CakeCustomization | undefined | null): number {
  if (!c) return 0;
  const shape = CAKE_SHAPES.find((s) => s.id === c.shape)?.price ?? 0;
  const frosting = CAKE_FROSTINGS.find((f) => f.id === c.frosting)?.price ?? 0;
  const toppings = c.toppings.reduce((sum, t) => sum + (CAKE_TOPPINGS.find((x) => x.id === t)?.price ?? 0), 0);
  return shape + frosting + toppings;
}

/** "Heart · Chocolate ganache · Fresh berries, Sugar flowers" */
export function describeCustomization(c: CakeCustomization | undefined | null): string {
  if (!c) return "";
  const shape = CAKE_SHAPES.find((s) => s.id === c.shape)?.label;
  const frosting = CAKE_FROSTINGS.find((f) => f.id === c.frosting)?.label;
  const toppings = c.toppings.map((t) => CAKE_TOPPINGS.find((x) => x.id === t)?.label).filter(Boolean);
  return [shape, frosting, toppings.length ? toppings.join(", ") : "No toppings"].filter(Boolean).join(" · ");
}
