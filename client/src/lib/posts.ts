/**
 * Recipes & notes. Kept as plain data so the bakery can edit copy without touching pages.
 * Each paragraph is a string; lines starting with "## " become headings and "- " list items.
 */
export interface Post {
  slug: string;
  title: string;
  summary: string;
  date: string; // YYYY-MM-DD
  minutes: number;
  art: { name: string; category: string };
  body: string[];
}

export const POSTS: Post[] = [
  {
    slug: "how-to-store-a-cream-cake",
    title: "How to keep a cream cake at its best",
    summary: "Fridge or counter, how long it lasts, and the 30-minute rule before serving.",
    date: "2026-10-02",
    minutes: 3,
    art: { name: "Red Velvet Cake", category: "cakes" },
    body: [
      "Fresh cream and cream cheese frostings are delicate. A few small habits keep a cake tasting the way it did when it left our kitchen.",
      "## As soon as it arrives",
      "- Keep the box flat and put it in the fridge within an hour, especially on warm days.",
      "- Leave it in the box. The box stops the frosting from drying out and picking up fridge smells.",
      "- Don't stack anything on top. Even a light box can press into whipped cream.",
      "## Before serving",
      "Take the cake out about 30 minutes before cutting. Cold sponge tastes muted and cream is firmer than it should be; half an hour on the counter brings both back.",
      "Dip a long knife in hot water and wipe it dry between slices for clean layers.",
      "## How long it keeps",
      "- Fresh cream and cream cheese cakes: 2 days in the fridge.",
      "- Ganache cakes: up to 3 days in the fridge.",
      "- Cheesecake: 3 days in the fridge, covered.",
      "Leftover slices keep best in an airtight box with the cut side covered.",
    ],
  },
  {
    slug: "why-our-sourdough-takes-36-hours",
    title: "Why our sourdough takes 36 hours",
    summary: "Slow fermentation is where the flavour, the open crumb and the crackling crust come from.",
    date: "2026-09-18",
    minutes: 4,
    art: { name: "Classic Sourdough Loaf", category: "breads" },
    body: [
      "A loaf of our sourdough is mixed two days before it's baked. That isn't a gimmick; each stage changes the bread in a way you can taste.",
      "## The starter",
      "Instead of commercial yeast we use a starter: flour and water that has been fed every day for years. It carries wild yeasts and lactic acid bacteria, which give sourdough its gentle tang.",
      "## The long, cold rest",
      "After shaping, the dough rests overnight in a cool fridge. Fermentation slows right down, and the bacteria have time to develop deeper, more rounded flavours than a quick rise ever could.",
      "## The bake",
      "We bake in a very hot, steamy oven. Steam keeps the surface soft for the first minutes so the loaf can spring up and the score opens into an 'ear'; then the steam is released and the crust turns deep brown and crisp.",
      "## Keeping it fresh at home",
      "- Store it cut-side down on a board for the first day.",
      "- After that, slice and freeze. Toast straight from frozen.",
    ],
  },
  {
    slug: "choosing-the-right-cake-size",
    title: "Choosing the right cake size",
    summary: "A quick guide to how many people 0.5 kg, 1 kg and 2 kg cakes really serve.",
    date: "2026-08-30",
    minutes: 2,
    art: { name: "Chocolate Truffle Cake", category: "cakes" },
    body: [
      "It's the question we're asked most. Here's how we think about it.",
      "## A rough guide",
      "- 0.5 kg: 4 to 6 slices. Right for a small family celebration.",
      "- 1 kg: 8 to 10 slices. The most popular size for birthdays at home.",
      "- 2 kg: 16 to 20 slices. For parties and office celebrations.",
      "## When to size up",
      "- If cake is the main dessert rather than one of several.",
      "- For children's parties, where every guest expects a slice (and some want two).",
      "## When a smaller cake is enough",
      "If there's a big meal before it, or you're also ordering cupcakes or cookies, guests tend to take thinner slices.",
      "Still unsure? Message us with the number of guests and we'll suggest a size.",
    ],
  },
];
