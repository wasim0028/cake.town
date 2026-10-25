import mongoose, { type InferSchemaType } from "mongoose";
import { toJSONPlugin } from "./plugins";

const addressSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    label: { type: String, default: "Home" },
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    line1: { type: String, required: true },
    line2: String,
    landmark: String,
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    location: { lat: Number, lng: Number },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);

addressSchema.plugin(toJSONPlugin, { hidden: ["user"] });

export type AddressFields = InferSchemaType<typeof addressSchema>;
export const Address = mongoose.model("Address", addressSchema);
