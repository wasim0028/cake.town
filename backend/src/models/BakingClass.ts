import mongoose, { type InferSchemaType } from "mongoose";
import { CLASS_LEVELS } from "@caketown/shared";
import { imageSchema, toJSONPlugin } from "./plugins";

const sessionSchema = new mongoose.Schema({
  startsAt: { type: Date, required: true },
  seats: { type: Number, required: true, min: 1 },
  booked: { type: Number, default: 0, min: 0 },
});

const bakingClassSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, default: "" },
    instructor: { name: { type: String, required: true }, bio: String, photo: String },
    image: imageSchema,
    level: { type: String, enum: CLASS_LEVELS, default: "beginner" },
    durationMinutes: { type: Number, required: true },
    price: { type: Number, required: true }, // paise per seat
    location: { type: String, default: "caketown studio" },
    whatYouWillLearn: { type: [String], default: [] },
    sessions: { type: [sessionSchema], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

bakingClassSchema.index({ isActive: 1, "sessions.startsAt": 1 });
bakingClassSchema.plugin(toJSONPlugin);

export type BakingClassFields = InferSchemaType<typeof bakingClassSchema>;
export const BakingClass = mongoose.model("BakingClass", bakingClassSchema);
