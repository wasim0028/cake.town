import mongoose, { type HydratedDocument, type InferSchemaType } from "mongoose";
import { BOOKING_PAYMENT_METHODS, BOOKING_STATUSES, PAYMENT_STATUSES } from "@caketown/shared";
import { toJSONPlugin } from "./plugins";

const bookingSchema = new mongoose.Schema(
  {
    bookingNumber: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    bakingClass: { type: mongoose.Schema.Types.ObjectId, ref: "BakingClass", required: true },
    sessionId: { type: mongoose.Schema.Types.ObjectId, required: true },
    /** Snapshot for display even if the class changes later. */
    classTitle: String,
    sessionStartsAt: Date,
    seats: { type: Number, required: true, min: 1 },
    amount: { type: Number, required: true }, // paise
    paymentMethod: { type: String, enum: BOOKING_PAYMENT_METHODS, required: true },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: "pending" },
    status: { type: String, enum: BOOKING_STATUSES, required: true },
    razorpay: { orderId: String, paymentId: String },
    paymentExpiresAt: Date,
  },
  { timestamps: true },
);

bookingSchema.index({ user: 1, createdAt: -1 });
bookingSchema.index({ "razorpay.orderId": 1 }, { sparse: true });
bookingSchema.index({ status: 1, paymentExpiresAt: 1 });
bookingSchema.plugin(toJSONPlugin);

export type BookingFields = InferSchemaType<typeof bookingSchema>;
export type BookingDoc = HydratedDocument<BookingFields>;
export const Booking = mongoose.model("Booking", bookingSchema);
