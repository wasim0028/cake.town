import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import type { Response, CookieOptions } from "express";
import type { Role } from "@caketown/shared";
import { env, isProd } from "../config/env";

export const ACCESS_COOKIE = "ct_at";
export const REFRESH_COOKIE = "ct_rt";
export const REFRESH_COOKIE_PATH = "/api/v1/auth";

export const accessTtlSeconds = () => env.ACCESS_TOKEN_TTL_MIN * 60;
export const refreshTtlMs = () => env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;

interface AccessPayload {
  sub: string;
  role: Role;
}

export function signAccessToken(userId: string, role: Role): string {
  return jwt.sign({ role } satisfies Omit<AccessPayload, "sub">, env.JWT_ACCESS_SECRET, {
    subject: userId,
    expiresIn: accessTtlSeconds(),
    issuer: "caketown",
    algorithm: "HS256",
  });
}

export function verifyAccessToken(token: string): AccessPayload {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, { issuer: "caketown", algorithms: ["HS256"] });
  if (typeof payload === "string" || !payload.sub) throw new Error("Malformed token");
  return { sub: payload.sub, role: (payload as jwt.JwtPayload & { role: Role }).role };
}

/** Opaque random refresh token; only its SHA-256 hash is stored. */
export function newRefreshToken(): string {
  return crypto.randomBytes(48).toString("base64url");
}

export function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function baseCookie(): CookieOptions {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  };
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie(ACCESS_COOKIE, accessToken, { ...baseCookie(), path: "/", maxAge: accessTtlSeconds() * 1000 });
  res.cookie(REFRESH_COOKIE, refreshToken, { ...baseCookie(), path: REFRESH_COOKIE_PATH, maxAge: refreshTtlMs() });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, { ...baseCookie(), path: "/" });
  res.clearCookie(REFRESH_COOKIE, { ...baseCookie(), path: REFRESH_COOKIE_PATH });
}
