import mongoose, { type Schema } from "mongoose";

/**
 * JSON output, applied to every model with `schema.plugin(toJSONPlugin, ...)`: `_id` becomes
 * `id`, `__v` is dropped, and `hidden` fields are never serialised even when explicitly loaded.
 * Applied to sub-documents too, so nested `_id`s become `id`.
 */
export function toJSONPlugin(schema: Schema, options?: { hidden?: string[] }) {
  const hidden = options?.hidden ?? [];
  const transform = (_doc: unknown, ret: Record<string, unknown>) => {
    if (ret._id !== undefined) {
      ret.id = String(ret._id);
      delete ret._id;
    }
    delete ret.__v;
    for (const field of hidden) delete ret[field];
    return ret;
  };
  schema.set("toJSON", { virtuals: false, versionKey: false, transform });
  schema.set("toObject", { virtuals: true, versionKey: false });
}

/** URL-safe slug: "Chocolate Truffle Cake (1kg)" -> "chocolate-truffle-cake-1kg" */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Shared sub-schema for images. */
export const imageSchema = new mongoose.Schema(
  { url: { type: String, required: true }, publicId: String, alt: String },
  { _id: false },
);
