import mongoose, { type InferSchemaType } from "mongoose";
import { toJSONPlugin } from "./plugins";

const customSchema = new mongoose.Schema(
  { shape: String, frosting: String, toppings: { type: [String], default: undefined } },
  { _id: false },
);

const cartItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  variantId: { type: mongoose.Schema.Types.ObjectId, required: true },
  quantity: { type: Number, required: true, min: 1, max: 20 },
  flavour: String,
  eggless: { type: Boolean, default: false },
  message: String,
  custom: { type: customSchema, default: undefined },
});

const cartSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    items: { type: [cartItemSchema], default: [] },
  },
  { timestamps: true },
);

cartSchema.plugin(toJSONPlugin);

export type CartFields = InferSchemaType<typeof cartSchema>;
export const Cart = mongoose.model("Cart", cartSchema);
