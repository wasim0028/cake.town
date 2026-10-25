import mongoose, { type HydratedDocument, type InferSchemaType } from "mongoose";
import { DIETARY_TAGS } from "@caketown/shared";
import { imageSchema, toJSONPlugin } from "./plugins";

const variantSchema = new mongoose.Schema({
  label: { type: String, required: true },
  weightGrams: Number,
  price: { type: Number, required: true, min: 0 }, // paise
  compareAtPrice: Number, // paise, shown struck through
  stock: { type: Number, default: 0, min: 0 },
  sku: String,
});

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, default: "" },
    shortDescription: String,
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    images: { type: [imageSchema], default: [] },
    variants: { type: [variantSchema], validate: [(v: unknown[]) => v.length > 0, "At least one variant is required"] },
    flavours: { type: [String], default: [] },
    dietary: { type: [String], enum: DIETARY_TAGS, default: [] },
    egglessOption: {
      available: { type: Boolean, default: false },
      extraPrice: { type: Number, default: 0 },
    },
    allowsMessage: { type: Boolean, default: false },
    maxMessageLength: { type: Number, default: 30 },
    preparationHours: { type: Number, default: 4 },
    tags: { type: [String], default: [] },
    isBestseller: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    /** Shown in the cake builder; accepts shape/frosting/topping choices. */
    isCustomizable: { type: Boolean, default: false },
    lowStockThreshold: { type: Number, default: 5 },
    /** Lowest variant price, kept in sync for sorting and price filters. */
    priceFrom: { type: Number, default: 0 },
    rating: {
      average: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },
    /** Units sold, used for "popular" sorting. */
    soldCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

productSchema.index({ isActive: 1, category: 1, priceFrom: 1 });
productSchema.index({ isActive: 1, isBestseller: 1 });
productSchema.index({ isActive: 1, soldCount: -1 });
productSchema.index({ dietary: 1 });
productSchema.index(
  { name: "text", tags: "text", description: "text" },
  { weights: { name: 10, tags: 5, description: 1 }, name: "product_text" },
);

productSchema.pre("save", function () {
  if (this.variants?.length) this.priceFrom = Math.min(...this.variants.map((v) => v.price));
});

productSchema.plugin(toJSONPlugin);

export type ProductFields = InferSchemaType<typeof productSchema>;
export type ProductDoc = HydratedDocument<ProductFields>;
export const Product = mongoose.model("Product", productSchema);
