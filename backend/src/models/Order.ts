import mongoose, { type HydratedDocument, type InferSchemaType } from "mongoose";
import { DELIVERY_SLOTS, ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES } from "@caketown/shared";
import { toJSONPlugin } from "./plugins";

/**
 * Order items and the address are SNAPSHOTS: they copy name, price and options at the time of
 * purchase so later product edits never change past orders.
 */
const customSchema = new mongoose.Schema(
  { shape: String, frosting: String, toppings: { type: [String], default: undefined } },
  { _id: false },
);

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    variantId: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    slug: String,
    image: String,
    variantLabel: { type: String, required: true },
    unitPrice: { type: Number, required: true },
    quantity: { type: Number, required: true },
    flavour: String,
    eggless: { type: Boolean, default: false },
    message: String,
    custom: { type: customSchema, default: undefined },
    customSummary: String,
    lineTotal: { type: Number, required: true },
  },
  { _id: false },
);

const addressSnapshotSchema = new mongoose.Schema(
  {
    label: String,
    fullName: String,
    phone: String,
    line1: String,
    line2: String,
    landmark: String,
    city: String,
    state: String,
    pincode: String,
    location: { lat: Number, lng: Number },
  },
  { _id: false },
);

const statusEventSchema = new mongoose.Schema(
  {
    status: { type: String, enum: ORDER_STATUSES, required: true },
    at: { type: Date, default: Date.now },
    note: String,
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: { type: [orderItemSchema], required: true },
    address: { type: addressSnapshotSchema, required: true },
    deliveryDate: { type: String, required: true }, // YYYY-MM-DD in Asia/Kolkata
    deliverySlot: { type: String, enum: DELIVERY_SLOTS, required: true },
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    deliveryFee: { type: Number, default: 0 },
    total: { type: Number, required: true },
    coupon: { code: String, discount: Number },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, required: true },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: "pending" },
    status: { type: String, enum: ORDER_STATUSES, required: true },
    statusHistory: { type: [statusEventSchema], default: [] },
    razorpay: {
      orderId: { type: String },
      paymentId: String,
      refundId: String,
      refundedAmount: Number,
    },
    /** Unpaid online orders are cancelled (and stock released) after this time. */
    paymentExpiresAt: Date,
    cancelReason: String,
    notes: String,
  },
  { timestamps: true },
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ "razorpay.orderId": 1 }, { sparse: true });
orderSchema.index({ status: 1, paymentExpiresAt: 1 });
orderSchema.index({ "coupon.code": 1, user: 1 });

orderSchema.plugin(toJSONPlugin);

export type OrderFields = InferSchemaType<typeof orderSchema>;
export type OrderDoc = HydratedDocument<OrderFields>;
export const Order = mongoose.model("Order", orderSchema);
