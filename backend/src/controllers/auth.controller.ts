import crypto from "node:crypto";
import type { Request, Response } from "express";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  otpRequestSchema,
  otpVerifySchema,
  refreshSchema,
  resetPasswordSchema,
  signupSchema,
  updateProfileSchema,
  type User as UserDTO,
} from "@caketown/shared";
import { features, isProd } from "../config/env";
import { User, type UserDoc } from "../models";
import { cache } from "../services/cache";
import { notifyOtp, notifyPasswordReset, notifyWelcome } from "../services/notify";
import { AppError, conflict, notFound, unauthorized } from "../utils/errors";
import { isMobileClient, parse, userId } from "../utils/http";
import {
  REFRESH_COOKIE,
  accessTtlSeconds,
  clearAuthCookies,
  newRefreshToken,
  refreshTtlMs,
  setAuthCookies,
  sha256,
  signAccessToken,
} from "../utils/tokens";

const MAX_SESSIONS = 10;

export function presentUser(u: Pick<UserDoc, "_id" | "name" | "email" | "role"> & Partial<UserDoc>): UserDTO {
  return {
    id: String(u._id),
    name: u.name,
    email: u.email,
    ...(u.phone ? { phone: u.phone } : {}),
    role: u.role as UserDTO["role"],
    ...(u.avatar ? { avatar: u.avatar } : {}),
    createdAt: (u.createdAt ?? new Date()).toISOString(),
  };
}

/** Creates a refresh session for this device and returns tokens (body for mobile, cookies for web). */
async function issueSession(req: Request, res: Response, user: UserDoc, status = 200) {
  const refreshToken = newRefreshToken();
  const now = Date.now();
  await User.updateOne(
    { _id: user._id },
    {
      $push: {
        sessions: {
          $each: [
            {
              tokenHash: sha256(refreshToken),
              userAgent: req.get("user-agent")?.slice(0, 200),
              ip: req.ip,
              expiresAt: new Date(now + refreshTtlMs()),
              createdAt: new Date(now),
            },
          ],
          $slice: -MAX_SESSIONS, // keep the most recent devices
        },
      },
      $set: { lastLoginAt: new Date(now) },
    },
  );
  await User.updateOne({ _id: user._id }, { $pull: { sessions: { expiresAt: { $lt: new Date(now) } } } });

  const accessToken = signAccessToken(String(user._id), user.role as UserDTO["role"]);
  const body = { user: presentUser(user), expiresIn: accessTtlSeconds() };
  if (isMobileClient(req)) return res.status(status).json({ ...body, accessToken, refreshToken });
  setAuthCookies(res, accessToken, refreshToken);
  return res.status(status).json(body);
}

export async function signup(req: Request, res: Response) {
  const input = parse(signupSchema, req.body);
  if (await User.exists({ email: input.email })) throw conflict("An account with this email already exists", "EMAIL_TAKEN");
  const user = await User.create({ name: input.name, email: input.email, phone: input.phone, password: input.password });
  notifyWelcome(user);
  return issueSession(req, res, user, 201);
}

export async function login(req: Request, res: Response) {
  const input = parse(loginSchema, req.body);
  const user = await User.findOne({ email: input.email }).select("+password");
  // Same message whether the email or the password is wrong. The token is issued only
  // AFTER the password matches (the old code set the cookie first).
  if (!user || !(await user.comparePassword(input.password))) {
    throw unauthorized("Incorrect email or password", "INVALID_CREDENTIALS");
  }
  return issueSession(req, res, user);
}

/** Rotate: remove the used refresh token in the same atomic step that finds it, so it can't be reused. */
function useRefreshToken(token: string) {
  const hash = sha256(token);
  return User.findOneAndUpdate(
    { sessions: { $elemMatch: { tokenHash: hash, expiresAt: { $gt: new Date() } } } },
    { $pull: { sessions: { tokenHash: hash } } },
    { new: true },
  );
}

/**
 * Who is signed in, for the website on page load. Never answers 401: guests get `{ user: null }`
 * (so browsers don't log an error for every visitor). If the 15-minute access cookie has lapsed
 * but the refresh cookie is still good, the session is renewed in the same call, so people stay
 * signed in across visits instead of looking signed out after a quarter of an hour.
 */
export async function session(req: Request, res: Response) {
  if (req.user) {
    const user = await User.findById(req.user.id);
    if (user) return res.json({ user: presentUser(user), expiresIn: accessTtlSeconds() });
  }
  const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (token) {
    const user = await useRefreshToken(token);
    if (user) return issueSession(req, res, user);
    clearAuthCookies(res);
  }
  res.json({ user: null });
}

export async function refresh(req: Request, res: Response) {
  const body = parse(refreshSchema, req.body ?? {});
  const token = body.refreshToken ?? req.cookies?.[REFRESH_COOKIE];
  if (!token) throw unauthorized("Please log in again", "NO_REFRESH_TOKEN");

  const user = await useRefreshToken(token);
  if (!user) {
    clearAuthCookies(res);
    throw unauthorized("Please log in again", "INVALID_REFRESH_TOKEN");
  }
  return issueSession(req, res, user);
}

export async function logout(req: Request, res: Response) {
  const body = parse(refreshSchema, req.body ?? {});
  const token = body.refreshToken ?? req.cookies?.[REFRESH_COOKIE];
  if (token) await User.updateOne({ "sessions.tokenHash": sha256(token) }, { $pull: { sessions: { tokenHash: sha256(token) } } });
  clearAuthCookies(res);
  res.status(204).end();
}

export async function logoutAll(req: Request, res: Response) {
  await User.updateOne({ _id: userId(req) }, { $set: { sessions: [] } });
  clearAuthCookies(res);
  res.status(204).end();
}

export async function me(req: Request, res: Response) {
  const user = await User.findById(userId(req));
  if (!user) throw notFound("User");
  res.json({ user: presentUser(user) });
}

export async function updateMe(req: Request, res: Response) {
  const input = parse(updateProfileSchema, req.body);
  const user = await User.findById(userId(req));
  if (!user) throw notFound("User");
  if (input.phone && input.phone !== user.phone) user.phoneVerified = false;
  user.set(input);
  await user.save();
  res.json({ user: presentUser(user) });
}

export async function changePassword(req: Request, res: Response) {
  const input = parse(changePasswordSchema, req.body);
  const user = await User.findById(userId(req)).select("+password");
  if (!user) throw notFound("User");
  if (!(await user.comparePassword(input.currentPassword))) {
    throw new AppError(422, "WRONG_PASSWORD", "Your current password is incorrect");
  }
  user.password = input.newPassword;
  user.set("sessions", []); // sign out every other device
  await user.save();
  return issueSession(req, res, user);
}

export async function forgotPassword(req: Request, res: Response) {
  const { email } = parse(forgotPasswordSchema, req.body);
  const user = await User.findOne({ email });
  if (user) {
    const token = crypto.randomBytes(32).toString("base64url");
    user.set("passwordReset", { tokenHash: sha256(token), expiresAt: new Date(Date.now() + 30 * 60_000) });
    await user.save();
    notifyPasswordReset(user, token);
  }
  // Same answer either way so nobody can check which emails have accounts.
  res.json({ message: "If an account exists for that email, a reset link is on its way." });
}

export async function resetPassword(req: Request, res: Response) {
  const input = parse(resetPasswordSchema, req.body);
  const user = await User.findOne({
    "passwordReset.tokenHash": sha256(input.token),
    "passwordReset.expiresAt": { $gt: new Date() },
  });
  if (!user) throw new AppError(400, "INVALID_RESET_TOKEN", "This reset link is invalid or has expired");
  user.password = input.password;
  user.set("passwordReset", undefined);
  user.set("sessions", []);
  await user.save();
  return issueSession(req, res, user);
}

/* ---------- phone OTP login (mobile app) ---------- */

const OTP_TTL = 10 * 60;
const OTP_MAX_ATTEMPTS = 5;

export async function requestOtp(req: Request, res: Response) {
  const { phone } = parse(otpRequestSchema, req.body);
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  await cache.set(`otp:${phone}`, { hash: sha256(code) }, OTP_TTL);
  await cache.del(`otp-attempts:${phone}`);
  notifyOtp(phone, code);
  res.json({
    message: "We've sent a 6-digit code to your phone.",
    expiresIn: OTP_TTL,
    // Development convenience only: when SMS isn't configured the code is returned so you can test.
    ...(!features.sms && !isProd ? { devCode: code } : {}),
  });
}

export async function verifyOtp(req: Request, res: Response) {
  const { phone, code } = parse(otpVerifySchema, req.body);
  const attempts = await cache.incr(`otp-attempts:${phone}`, OTP_TTL);
  if (attempts > OTP_MAX_ATTEMPTS) throw new AppError(429, "TOO_MANY_ATTEMPTS", "Too many attempts. Request a new code.");

  const stored = await cache.get<{ hash: string }>(`otp:${phone}`);
  if (!stored || stored.hash !== sha256(code)) throw new AppError(400, "INVALID_OTP", "That code is incorrect or has expired");
  await cache.del(`otp:${phone}`);

  const user = await User.findOne({ phone });
  if (!user) throw new AppError(404, "NO_ACCOUNT", "No account uses this number yet. Please sign up first.");
  user.phoneVerified = true;
  await user.save();
  return issueSession(req, res, user);
}
