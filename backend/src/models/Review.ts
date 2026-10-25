import mongoose, { type InferSchemaType } from "mongoose";
import { toJSONPlugin } from "./plugins";

const reviewSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: String,
    comment: { type: String, default: "" },
    verifiedPurchase: { type: Boolean, default: false },
    isHidden: { type: Boolean, default: false },
  },
  { timestamps: true },
);

reviewSchema.index({ product: 1, user: 1 }, { unique: true });
reviewSchema.index({ product: 1, isHidden: 1, createdAt: -1 });
reviewSchema.plugin(toJSONPlugin);

export type ReviewFields = InferSchemaType<typeof reviewSchema>;
export const Review = mongoose.model("Review", reviewSchema);
