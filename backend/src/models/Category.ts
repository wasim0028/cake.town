import mongoose, { type InferSchemaType } from "mongoose";
import { imageSchema, toJSONPlugin } from "./plugins";

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    description: String,
    image: imageSchema,
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

categorySchema.index({ isActive: 1, sortOrder: 1 });
categorySchema.plugin(toJSONPlugin);

export type CategoryFields = InferSchemaType<typeof categorySchema>;
export const Category = mongoose.model("Category", categorySchema);
