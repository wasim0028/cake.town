/**
 * Starter catalogue for caketown. Prices are in paise (₹549 = 54900).
 * Images are left empty on purpose: upload real product photos from the admin dashboard
 * (they go to Cloudinary). The web and mobile apps show a branded placeholder until then.
 */
import type { DietaryTag } from "@caketown/shared";

export const categories = [
  { name: "Cakes", slug: "cakes", description: "Celebration cakes baked to order, with eggless options.", sortOrder: 1 },
  { name: "Breads", slug: "breads", description: "Slow-fermented loaves baked fresh every morning.", sortOrder: 2 },
  { name: "Pastries", slug: "pastries", description: "Flaky, buttery viennoiserie and French classics.", sortOrder: 3 },
  { name: "Cupcakes", slug: "cupcakes", description: "Cupcakes and muffins in gift boxes.", sortOrder: 4 },
  { name: "Cookies", slug: "cookies", description: "Cookies, biscotti and Indian bakery favourites.", sortOrder: 5 },
];

const r = (rupees: number) => rupees * 100;
const cakeSizes = (half: number, one: number, two?: number) => [
  { label: "0.5 kg", weightGrams: 500, price: r(half) },
  { label: "1 kg", weightGrams: 1000, price: r(one) },
  ...(two ? [{ label: "2 kg", weightGrams: 2000, price: r(two) }] : []),
];
const cakeDefaults = {
  egglessOption: { available: true, extraPrice: r(60) },
  allowsMessage: true,
  maxMessageLength: 30,
  preparationHours: 4,
};

export interface SeedProduct {
  name: string;
  category: string;
  shortDescription: string;
  description: string;
  variants: { label: string; weightGrams?: number; price: number; compareAtPrice?: number }[];
  flavours?: string[];
  dietary?: DietaryTag[];
  egglessOption?: { available: boolean; extraPrice: number };
  allowsMessage?: boolean;
  maxMessageLength?: number;
  preparationHours?: number;
  tags?: string[];
  isBestseller?: boolean;
  isFeatured?: boolean;
  isCustomizable?: boolean;
}

export const products: SeedProduct[] = [
  // ---------- Cakes ----------
  {
    name: "Chocolate Truffle Cake",
    category: "cakes",
    shortDescription: "Layers of dark chocolate sponge and silky truffle ganache.",
    description:
      "Our most-loved cake: moist dark chocolate sponge soaked in light syrup, layered and covered with a rich 54% couverture truffle ganache. Finished with chocolate shards.",
    variants: cakeSizes(549, 999, 1899),
    ...cakeDefaults,
    tags: ["chocolate", "birthday", "anniversary"],
    isBestseller: true,
    isFeatured: true,
  },
  {
    name: "Red Velvet Cake",
    category: "cakes",
    shortDescription: "Soft cocoa-buttermilk sponge with cream cheese frosting.",
    description: "Velvety red sponge with a gentle cocoa note, layered with tangy whipped cream cheese frosting and topped with red velvet crumbs.",
    variants: cakeSizes(649, 1199, 2249),
    ...cakeDefaults,
    tags: ["red velvet", "cream cheese", "anniversary"],
    isBestseller: true,
  },
  {
    name: "Black Forest Cake",
    category: "cakes",
    shortDescription: "Chocolate sponge, whipped cream and dark cherries.",
    description: "The classic: chocolate sponge soaked in cherry syrup, fresh whipped cream, dark cherries and chocolate curls.",
    variants: cakeSizes(499, 899, 1699),
    ...cakeDefaults,
    tags: ["cherry", "classic", "birthday"],
  },
  {
    name: "Pineapple Fresh Cream Cake",
    category: "cakes",
    shortDescription: "Light vanilla sponge with pineapple and fresh cream.",
    description: "A light, fruity favourite: vanilla sponge, juicy pineapple chunks and fresh whipped cream.",
    variants: cakeSizes(449, 799, 1499),
    ...cakeDefaults,
    tags: ["fruit", "classic"],
  },
  {
    name: "Blueberry Cheesecake",
    category: "cakes",
    shortDescription: "Baked New York cheesecake with blueberry compote.",
    description: "Creamy baked cheesecake on a buttery biscuit base, topped with a glossy blueberry compote. Needs 8 hours to set.",
    variants: cakeSizes(699, 1299),
    flavours: ["Blueberry", "Strawberry", "Classic"],
    egglessOption: { available: false, extraPrice: 0 },
    allowsMessage: true,
    maxMessageLength: 24,
    preparationHours: 8,
    tags: ["cheesecake", "blueberry"],
    isFeatured: true,
  },
  {
    name: "Belgian Chocolate Mousse Cake",
    category: "cakes",
    shortDescription: "Airy Belgian chocolate mousse on a crunchy praline base.",
    description: "Three textures of chocolate: hazelnut praline crunch, chocolate sponge and an airy Belgian chocolate mousse with a mirror glaze.",
    variants: cakeSizes(699, 1299, 2399),
    ...cakeDefaults,
    preparationHours: 6,
    tags: ["chocolate", "premium"],
    isFeatured: true,
  },
  {
    name: "Mango Delight Cake",
    category: "cakes",
    shortDescription: "Alphonso mango cream and vanilla sponge.",
    description: "Vanilla sponge layered with Alphonso mango cream and fresh mango pieces. A summer favourite, available all year with mango pulp.",
    variants: cakeSizes(599, 1099),
    ...cakeDefaults,
    tags: ["mango", "fruit"],
  },
  {
    name: "Butterscotch Crunch Cake",
    category: "cakes",
    shortDescription: "Caramel sponge with butterscotch cream and praline crunch.",
    description: "Caramel-scented sponge, butterscotch whipped cream and crunchy cashew praline, drizzled with salted caramel.",
    variants: cakeSizes(499, 899, 1699),
    ...cakeDefaults,
    tags: ["butterscotch", "caramel", "birthday"],
  },
  {
    name: "Rasmalai Fusion Cake",
    category: "cakes",
    shortDescription: "Saffron sponge soaked in rabdi, with rasmalai and pistachio.",
    description: "An Indian classic meets French pâtisserie: saffron-cardamom sponge soaked in rabdi, layered with soft rasmalai and finished with pistachio and rose petals.",
    variants: cakeSizes(699, 1299, 2399),
    ...cakeDefaults,
    preparationHours: 6,
    tags: ["fusion", "rasmalai", "festive", "indian"],
    isBestseller: true,
    isFeatured: true,
  },
  {
    name: "Custom Photo Cake",
    category: "cakes",
    shortDescription: "Your photo printed on an edible sheet. Order a day ahead.",
    description: "Vanilla or chocolate sponge with fresh cream and your photo printed in edible ink. Upload the photo after ordering; we'll contact you on WhatsApp.",
    variants: cakeSizes(899, 1599, 2999),
    flavours: ["Vanilla", "Chocolate", "Butterscotch", "Pineapple"],
    ...cakeDefaults,
    preparationHours: 24,
    tags: ["custom", "photo", "birthday"],
  },

  {
    name: "Design Your Own Cake",
    category: "cakes",
    shortDescription: "Pick the shape, sponge, frosting and toppings. We bake it for you.",
    description:
      "Built in our cake designer: choose a round, square or heart cake, your sponge flavour, a frosting and up to four toppings, then add a message. Needs a day to make.",
    variants: cakeSizes(649, 1199, 2249),
    flavours: ["Vanilla", "Chocolate", "Red velvet", "Butterscotch", "Pineapple", "Mango"],
    ...cakeDefaults,
    preparationHours: 24,
    tags: ["custom", "birthday", "anniversary", "builder"],
    isCustomizable: true,
    isFeatured: true,
  },

  // ---------- Breads ----------
  {
    name: "Classic Sourdough Loaf",
    category: "breads",
    shortDescription: "36-hour fermented country loaf with a crackling crust.",
    description: "Naturally leavened with our 6-year-old starter, fermented for 36 hours. Open crumb, deep flavour, crackling crust.",
    variants: [{ label: "500 g loaf", weightGrams: 500, price: r(249) }],
    dietary: ["vegan", "eggless"],
    preparationHours: 2,
    tags: ["sourdough", "artisan"],
    isBestseller: true,
  },
  {
    name: "Multigrain Sandwich Bread",
    category: "breads",
    shortDescription: "Soft everyday loaf with oats, flax and sunflower seeds.",
    description: "Whole wheat and multigrain flour with oats, flax and sunflower seeds. No preservatives, sliced on request.",
    variants: [{ label: "400 g loaf", weightGrams: 400, price: r(99) }],
    dietary: ["vegan", "eggless"],
    preparationHours: 2,
    tags: ["healthy", "everyday"],
  },
  {
    name: "Garlic Herb Focaccia",
    category: "breads",
    shortDescription: "Olive-oil focaccia with roasted garlic and rosemary.",
    description: "Pillowy focaccia drenched in extra-virgin olive oil, roasted garlic, rosemary and sea salt flakes.",
    variants: [{ label: "Half tray", price: r(199) }, { label: "Full tray", price: r(379) }],
    dietary: ["vegan", "eggless"],
    preparationHours: 2,
    tags: ["focaccia", "italian"],
  },
  {
    name: "Butter Brioche Loaf",
    category: "breads",
    shortDescription: "Rich, golden brioche made with French butter.",
    description: "Soft, rich brioche made with eggs and French butter. Perfect for French toast.",
    variants: [{ label: "350 g loaf", weightGrams: 350, price: r(179) }],
    preparationHours: 2,
    tags: ["brioche", "breakfast"],
  },
  {
    name: "Chocolate Babka",
    category: "breads",
    shortDescription: "Twisted brioche swirled with dark chocolate.",
    description: "Brioche dough rolled with dark chocolate and cocoa, twisted, baked and brushed with syrup.",
    variants: [{ label: "Loaf", weightGrams: 450, price: r(349) }],
    preparationHours: 3,
    tags: ["babka", "chocolate"],
  },

  // ---------- Pastries ----------
  {
    name: "Butter Croissant",
    category: "pastries",
    shortDescription: "81 layers of French butter, baked every morning.",
    description: "Laminated by hand with French butter for a shattering crust and honeycomb crumb.",
    variants: [{ label: "1 piece", price: r(89) }, { label: "Box of 4", price: r(329), compareAtPrice: r(356) }],
    preparationHours: 1,
    tags: ["croissant", "breakfast", "french"],
    isBestseller: true,
  },
  {
    name: "Almond Croissant",
    category: "pastries",
    shortDescription: "Twice-baked croissant with almond frangipane.",
    description: "Croissant filled with almond frangipane, topped with flaked almonds and icing sugar.",
    variants: [{ label: "1 piece", price: r(129) }, { label: "Box of 4", price: r(479), compareAtPrice: r(516) }],
    preparationHours: 1,
    tags: ["croissant", "almond"],
  },
  {
    name: "Pain au Chocolat",
    category: "pastries",
    shortDescription: "Croissant dough wrapped around two batons of dark chocolate.",
    description: "Buttery laminated dough around two batons of 54% dark chocolate.",
    variants: [{ label: "1 piece", price: r(119) }, { label: "Box of 4", price: r(449), compareAtPrice: r(476) }],
    preparationHours: 1,
    tags: ["chocolate", "french"],
  },
  {
    name: "Cinnamon Roll",
    category: "pastries",
    shortDescription: "Soft roll swirled with cinnamon sugar and cream cheese glaze.",
    description: "Pillowy dough rolled with brown sugar and Ceylon cinnamon, finished with cream cheese glaze.",
    variants: [{ label: "1 piece", price: r(109) }, { label: "Box of 4", price: r(399), compareAtPrice: r(436) }],
    preparationHours: 1,
    tags: ["cinnamon", "breakfast"],
    isBestseller: true,
  },
  {
    name: "Chocolate Éclair",
    category: "pastries",
    shortDescription: "Choux pastry with vanilla custard and chocolate glaze.",
    description: "Crisp choux filled with vanilla bean pastry cream and dipped in dark chocolate glaze.",
    variants: [{ label: "1 piece", price: r(99) }, { label: "Box of 6", price: r(549), compareAtPrice: r(594) }],
    preparationHours: 2,
    tags: ["eclair", "french", "chocolate"],
  },
  {
    name: "Seasonal Fruit Danish",
    category: "pastries",
    shortDescription: "Flaky Danish with custard and fresh seasonal fruit.",
    description: "Laminated Danish dough, vanilla custard and the best fruit of the week.",
    variants: [{ label: "1 piece", price: r(119) }],
    preparationHours: 1,
    tags: ["danish", "fruit"],
  },

  // ---------- Cupcakes ----------
  {
    name: "Red Velvet Cupcakes",
    category: "cupcakes",
    shortDescription: "Red velvet cupcakes with cream cheese swirl.",
    description: "Moist red velvet cupcakes topped with a tall cream cheese frosting swirl.",
    variants: [{ label: "Box of 4", price: r(349) }, { label: "Box of 6", price: r(499) }],
    egglessOption: { available: true, extraPrice: r(30) },
    preparationHours: 3,
    tags: ["cupcake", "gift"],
  },
  {
    name: "Blueberry Muffins",
    category: "cupcakes",
    shortDescription: "Bursting with blueberries, topped with crumble.",
    description: "Buttermilk muffins loaded with blueberries and a crunchy streusel top.",
    variants: [{ label: "1 piece", price: r(89) }, { label: "Box of 4", price: r(329) }],
    preparationHours: 1,
    tags: ["muffin", "breakfast", "blueberry"],
    isBestseller: true,
  },
  {
    name: "Chocolate Fudge Cupcakes",
    category: "cupcakes",
    shortDescription: "Dark chocolate cupcakes with fudge frosting.",
    description: "Rich chocolate cupcakes with a molten fudge centre and chocolate fudge frosting.",
    variants: [{ label: "Box of 4", price: r(329) }, { label: "Box of 6", price: r(479) }],
    egglessOption: { available: true, extraPrice: r(30) },
    preparationHours: 3,
    tags: ["cupcake", "chocolate", "gift"],
  },
  {
    name: "Vanilla Rainbow Cupcakes",
    category: "cupcakes",
    shortDescription: "Eggless vanilla cupcakes with rainbow sprinkles. Kids love them.",
    description: "Fully eggless vanilla bean cupcakes with buttercream and rainbow sprinkles.",
    variants: [{ label: "Box of 4", price: r(299) }, { label: "Box of 6", price: r(429) }],
    dietary: ["eggless"],
    preparationHours: 3,
    tags: ["cupcake", "kids", "party"],
  },

  // ---------- Cookies ----------
  {
    name: "Chocolate Chip Cookies",
    category: "cookies",
    shortDescription: "Chewy centres, crisp edges, lots of chocolate.",
    description: "Brown-butter cookies with dark and milk chocolate chunks and a pinch of sea salt.",
    variants: [{ label: "250 g", weightGrams: 250, price: r(249) }, { label: "500 g", weightGrams: 500, price: r(449) }],
    preparationHours: 1,
    tags: ["cookie", "chocolate", "gift"],
    isBestseller: true,
  },
  {
    name: "Oatmeal Raisin Cookies",
    category: "cookies",
    shortDescription: "Chewy oat cookies with plump raisins and cinnamon.",
    description: "Rolled oats, juicy raisins, cinnamon and brown sugar.",
    variants: [{ label: "250 g", weightGrams: 250, price: r(229) }],
    preparationHours: 1,
    tags: ["cookie", "oats"],
  },
  {
    name: "Almond Biscotti",
    category: "cookies",
    shortDescription: "Twice-baked Italian biscotti for your coffee.",
    description: "Crunchy biscotti with whole almonds and orange zest. Made for dunking.",
    variants: [{ label: "200 g", weightGrams: 200, price: r(299) }],
    preparationHours: 1,
    tags: ["biscotti", "italian"],
  },
  {
    name: "Nankhatai",
    category: "cookies",
    shortDescription: "Melt-in-the-mouth Indian shortbread with cardamom.",
    description: "Classic eggless nankhatai made with ghee, gram flour and green cardamom.",
    variants: [{ label: "250 g", weightGrams: 250, price: r(199) }],
    dietary: ["eggless"],
    preparationHours: 1,
    tags: ["indian", "festive"],
  },
  {
    name: "Coconut Macaroons",
    category: "cookies",
    shortDescription: "Gluten-free coconut macaroons dipped in dark chocolate.",
    description: "Golden coconut macaroons with a dark chocolate base. Naturally gluten-free.",
    variants: [{ label: "200 g", weightGrams: 200, price: r(279) }],
    dietary: ["gluten-free"],
    preparationHours: 1,
    tags: ["coconut", "gluten-free"],
  },
];

export const coupons = [
  {
    code: "WELCOME10",
    description: "10% off your first order (up to ₹150)",
    type: "percent" as const,
    value: 10,
    minOrder: r(499),
    maxDiscount: r(150),
    perUserLimit: 1,
  },
  {
    code: "FLAT100",
    description: "₹100 off orders above ₹999",
    type: "flat" as const,
    value: r(100),
    minOrder: r(999),
    perUserLimit: 3,
  },
];

export const classes = [
  {
    title: "Cake Decorating Basics",
    level: "beginner" as const,
    durationMinutes: 180,
    price: r(2499),
    instructor: { name: "Ananya Rao", bio: "Head cake artist at caketown; 10 years of wedding cakes." },
    description: "Learn to level, fill and crumb-coat a cake, then pipe rosettes, borders and a drip finish. You take home the cake you decorate.",
    whatYouWillLearn: ["Levelling and stacking layers", "Crumb coat and smooth finish", "Piping rosettes and borders", "Chocolate drip technique"],
    seats: 10,
    hourIST: 11,
  },
  {
    title: "Artisan Sourdough Workshop",
    level: "intermediate" as const,
    durationMinutes: 240,
    price: r(2999),
    instructor: { name: "Kabir Mehta", bio: "Our bread lead, trained in San Francisco and Paris." },
    description: "From starter care to shaping and scoring. Includes a jar of our starter and a loaf to bake at home.",
    whatYouWillLearn: ["Feeding and maintaining a starter", "Folding and bulk fermentation", "Shaping and scoring", "Baking in a home oven"],
    seats: 8,
    hourIST: 10,
  },
  {
    title: "French Pastry Masterclass",
    level: "advanced" as const,
    durationMinutes: 300,
    price: r(3999),
    instructor: { name: "Meera Iyer", bio: "Pastry chef, Le Cordon Bleu graduate." },
    description: "Laminated dough by hand: croissants and pain au chocolat, plus choux for éclairs.",
    whatYouWillLearn: ["Lamination and turns", "Croissant shaping", "Proofing without a proofer", "Choux pastry and crème pâtissière"],
    seats: 8,
    hourIST: 10,
  },
  {
    title: "Kids' Cupcake Party",
    level: "beginner" as const,
    durationMinutes: 120,
    price: r(1499),
    instructor: { name: "Ananya Rao" },
    description: "A fun, eggless baking session for kids aged 6–12: bake, frost and decorate six cupcakes to take home.",
    whatYouWillLearn: ["Measuring and mixing", "Piping buttercream", "Decorating with sprinkles and fondant"],
    seats: 12,
    hourIST: 16,
  },
];
