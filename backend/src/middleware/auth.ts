import type { NextFunction, Request, Response } from "express";
import { User } from "../models";
import { forbidden, unauthorized } from "../utils/errors";
import { ACCESS_COOKIE, verifyAccessToken } from "../utils/tokens";

/**
 * Reads the access token from `Authorization: Bearer <token>` (mobile) or the httpOnly
 * `ct_at` cookie (web). Fixes the old bug where cookie-parser ran after the router.
 */
function readToken(req: Request): string | undefined {
  const header = req.get("authorization");
  if (header?.startsWith("Bearer ")) return header.slice(7).trim();
  return req.cookies?.[ACCESS_COOKIE];
}

function attachUser(req: Request): boolean {
  const token = readToken(req);
  if (!token) return false;
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    return true;
  } catch {
    return false;
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!attachUser(req)) {
    const hadToken = Boolean(readToken(req));
    return next(hadToken ? unauthorized("Your session has expired", "TOKEN_EXPIRED") : unauthorized());
  }
  next();
}

/** Attaches the user when a valid token is present but never rejects. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  attachUser(req);
  next();
}

/**
 * Admin-only routes. The role is re-checked against the database so a demoted admin loses
 * access immediately rather than when their access token expires.
 */
export async function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!attachUser(req)) return next(unauthorized());
  const user = await User.findById(req.user!.id).select("role").lean();
  if (!user || user.role !== "admin") return next(forbidden("Admins only"));
  req.user!.role = "admin";
  next();
}
