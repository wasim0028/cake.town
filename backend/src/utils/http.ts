import type { Request } from "express";
import type { z } from "zod";
import { unauthorized } from "./errors";

/** Parse and validate input with a zod schema. A ZodError becomes a 422 in the error handler. */
export function parse<S extends z.ZodType>(schema: S, data: unknown): z.output<S> {
  return schema.parse(data);
}

/**
 * For PATCH requests: validate with a partial schema, then keep ONLY the fields the client
 * actually sent. Without this, zod `.default()`s would fill in missing fields and silently
 * reset them (e.g. a product's dietary tags becoming [] when only `isBestseller` was sent).
 */
export function parsePatch<S extends z.ZodType>(schema: S, data: unknown): Partial<z.output<S>> {
  const parsed = schema.parse(data) as Record<string, unknown>;
  const sent = data && typeof data === "object" ? new Set(Object.keys(data)) : new Set<string>();
  return Object.fromEntries(Object.entries(parsed).filter(([k]) => sent.has(k))) as Partial<z.output<S>>;
}

/** The authenticated user's id (use only behind `requireAuth`). */
export function userId(req: Request): string {
  if (!req.user) throw unauthorized();
  return req.user.id;
}

/** True when the request comes from the mobile app, which uses bearer tokens instead of cookies. */
export function isMobileClient(req: Request): boolean {
  return req.get("x-client") === "mobile";
}

export function paginate<T>(items: T[], total: number, page: number, limit: number) {
  return { items, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

/** Escape user text for use inside a RegExp. */
export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
