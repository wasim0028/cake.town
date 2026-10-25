import mongoose, { type HydratedDocument, type InferSchemaType } from "mongoose";
import { COUPON_TYPES } from "@caketown/shared";
import { toJSONPlugin } from "./plugins";

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: String,
    type: { type: String, enum: COUPON_TYPES, required: true },
    /** Percent (1-100) for "percent", paise for "flat". */
    value: { type: Number, required: true },
    minOrder: { type: Number, default: 0 },
    maxDiscount: Number,
    usageLimit: Number,
    usedCount: { type: Number, default: 0 },
    perUserLimit: { type: Number, default: 1 },
    startsAt: Date,
    expiresAt: Date,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

couponSchema.plugin(toJSONPlugin);

export type CouponFields = InferSchemaType<typeof couponSchema>;
export type CouponDoc = HydratedDocument<CouponFields>;
export const Coupon = mongoose.model("Coupon", couponSchema);
