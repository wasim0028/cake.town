import bcrypt from "bcryptjs";
import mongoose, { type HydratedDocument, type InferSchemaType, type Model } from "mongoose";
import { ROLES } from "@caketown/shared";
import { toJSONPlugin } from "./plugins";

const sessionSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true },
    userAgent: String,
    ip: String,
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    phoneVerified: { type: Boolean, default: false },
    password: { type: String, select: false },
    role: { type: String, enum: ROLES, default: "customer", index: true },
    avatar: String,
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    /** Hashed refresh tokens, one per signed-in device. */
    sessions: { type: [sessionSchema], select: false, default: [] },
    passwordReset: {
      type: new mongoose.Schema({ tokenHash: String, expiresAt: Date }, { _id: false }),
      select: false,
    },
    lastLoginAt: Date,
    /** Kept from the original Cake Town signup form. */
    work: { type: String, trim: true },
  },
  { timestamps: true },
);

userSchema.index({ phone: 1 }, { sparse: true });

userSchema.pre("save", async function () {
  if (this.isModified("password") && this.password) {
    this.password = await bcrypt.hash(this.password, 12);
  }
});

userSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

userSchema.plugin(toJSONPlugin, { hidden: ["password", "sessions", "passwordReset", "wishlist", "tokens", "cpassword"] });

export type UserFields = InferSchemaType<typeof userSchema>;
interface UserMethods {
  comparePassword(candidate: string): Promise<boolean>;
}
export type UserDoc = HydratedDocument<UserFields, UserMethods>;

export const User = mongoose.model<UserFields, Model<UserFields, object, UserMethods>>("User", userSchema);
