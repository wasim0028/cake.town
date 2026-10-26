import { describe, expect, it } from "vitest";
import { User } from "../src/models";
import { sentEmails } from "../src/services/email";
import { flushBackground } from "../src/services/notify";
import { api, signupMobile, signupWeb } from "./helpers";

function cookieHeader(res: { headers: Record<string, unknown> }): string[] {
  const c = res.headers["set-cookie"];
  return Array.isArray(c) ? c : c ? [String(c)] : [];
}

describe("signup", () => {
  it("creates an account, sets httpOnly cookies and never returns the password", async () => {
    const res = await api()
      .post("/api/v1/auth/signup")
      .send({ name: "Asha", email: "Asha@Example.com", phone: "+91 98765 43210", password: "Cakes1234", confirmPassword: "Cakes1234" });
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ name: "Asha", email: "asha@example.com", phone: "9876543210", role: "customer" });
    expect(JSON.stringify(res.body)).not.toMatch(/password|Cakes1234/);
    const cookies = cookieHeader(res);
    expect(cookies.some((c) => c.startsWith("ct_at=") && /HttpOnly/i.test(c))).toBe(true);
    expect(cookies.some((c) => c.startsWith("ct_rt=") && /Path=\/api\/v1\/auth/.test(c))).toBe(true);
    expect(res.body.accessToken).toBeUndefined(); // web gets cookies only

    // cpassword is no longer stored; the password is a bcrypt hash.
    const raw = await User.collection.findOne({ email: "asha@example.com" });
    expect(raw?.cpassword).toBeUndefined();
    expect(String(raw?.password)).toMatch(/^\$2[aby]\$12\$/);
  });

  it("validates input with clear messages", async () => {
    const res = await api()
      .post("/api/v1/auth/signup")
      .send({ name: "A", email: "nope", phone: "123", password: "short", confirmPassword: "different" });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(Object.keys(res.body.error.details)).toEqual(expect.arrayContaining(["name", "email", "phone", "password"]));
  });

  it("rejects a duplicate email", async () => {
    const { credentials } = await signupWeb();
    const res = await api().post("/api/v1/auth/signup").send(credentials);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("EMAIL_TAKEN");
  });

  it("sends a welcome email in the background", async () => {
    const before = sentEmails.length;
    const { user } = await signupWeb();
    await flushBackground();
    expect(sentEmails.slice(before).some((e) => e.to === user.email && /Welcome/.test(e.subject))).toBe(true);
  });
});

describe("login", () => {
  it("does NOT issue a session for a wrong password (old bug)", async () => {
    const { credentials } = await signupWeb();
    const res = await api().post("/api/v1/auth/login").send({ email: credentials.email, password: "Wrong1234" });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
    expect(cookieHeader(res)).toHaveLength(0);
  });

  it("gives the same error for an unknown email", async () => {
    const res = await api().post("/api/v1/auth/login").send({ email: "nobody@example.com", password: "Cakes1234" });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe("Incorrect email or password");
  });

  it("logs in and reaches a protected route with the cookie (old cookie-parser bug)", async () => {
    const { credentials } = await signupWeb();
    const res = await api().post("/api/v1/auth/login").send({ email: credentials.email, password: credentials.password });
    expect(res.status).toBe(200);
    const me = await api().get("/api/v1/auth/me").set("Cookie", cookieHeader(res).map((c) => c.split(";")[0]).join("; "));
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(credentials.email);
  });

  it("returns 401 without a token", async () => {
    const res = await api().get("/api/v1/auth/me");
    expect(res.status).toBe(401);
  });
});

describe("mobile tokens", () => {
  it("returns bearer tokens in the body and accepts them", async () => {
    const { accessToken, refreshToken } = await signupMobile();
    expect(accessToken).toBeTruthy();
    expect(refreshToken).toBeTruthy();
    const me = await api().get("/api/v1/auth/me").set("Authorization", `Bearer ${accessToken}`);
    expect(me.status).toBe(200);
  });

  it("rotates refresh tokens: an old one can't be used twice", async () => {
    const { refreshToken } = await signupMobile();
    const first = await api().post("/api/v1/auth/refresh").set("X-Client", "mobile").send({ refreshToken });
    expect(first.status).toBe(200);
    expect(first.body.refreshToken).not.toBe(refreshToken);
    const reuse = await api().post("/api/v1/auth/refresh").set("X-Client", "mobile").send({ refreshToken });
    expect(reuse.status).toBe(401);
    const next = await api().post("/api/v1/auth/refresh").set("X-Client", "mobile").send({ refreshToken: first.body.refreshToken });
    expect(next.status).toBe(200);
  });

  it("logout revokes the refresh token", async () => {
    const { refreshToken } = await signupMobile();
    await api().post("/api/v1/auth/logout").send({ refreshToken }).expect(204);
    const res = await api().post("/api/v1/auth/refresh").send({ refreshToken });
    expect(res.status).toBe(401);
  });
});

describe("web refresh via cookie", () => {
  it("refreshes using the httpOnly refresh cookie", async () => {
    const { agent } = await signupWeb();
    const res = await agent.post("/api/v1/auth/refresh");
    expect(res.status).toBe(200);
    expect((await agent.get("/api/v1/auth/me")).status).toBe(200);
  });
});

describe("password reset", () => {
  it("emails a link whose token resets the password once", async () => {
    const { credentials } = await signupWeb();
    const before = sentEmails.length;
    const res = await api().post("/api/v1/auth/forgot-password").send({ email: credentials.email });
    expect(res.status).toBe(200);
    await flushBackground();
    const mail = sentEmails.slice(before).find((e) => e.to === credentials.email);
    const token = decodeURIComponent(/token=([^"&<\s]+)/.exec(mail!.html)![1]!);

    const reset = await api().post("/api/v1/auth/reset-password").send({ token, password: "NewCakes99" });
    expect(reset.status).toBe(200);
    const again = await api().post("/api/v1/auth/reset-password").send({ token, password: "NewCakes99" });
    expect(again.status).toBe(400);

    const login = await api().post("/api/v1/auth/login").send({ email: credentials.email, password: "NewCakes99" });
    expect(login.status).toBe(200);
  });

  it("answers the same for unknown emails", async () => {
    const res = await api().post("/api/v1/auth/forgot-password").send({ email: "ghost@example.com" });
    expect(res.status).toBe(200);
  });
});

describe("phone OTP", () => {
  it("logs in with a code (dev code returned when SMS is off)", async () => {
    const { credentials } = await signupWeb({ phone: "9123456780" });
    const req = await api().post("/api/v1/auth/otp/request").send({ phone: "+919123456780" });
    expect(req.status).toBe(200);
    const code = req.body.devCode as string;
    expect(code).toMatch(/^\d{6}$/);

    const wrong = await api().post("/api/v1/auth/otp/verify").send({ phone: "9123456780", code: code === "000000" ? "111111" : "000000" });
    expect(wrong.status).toBe(400);

    const ok = await api().post("/api/v1/auth/otp/verify").set("X-Client", "mobile").send({ phone: "9123456780", code });
    expect(ok.status).toBe(200);
    expect(ok.body.user.email).toBe(credentials.email);
    expect(ok.body.accessToken).toBeTruthy();
  });
});

describe("web session on page load", () => {
  it("answers guests with user: null instead of a 401", async () => {
    const res = await api().get("/api/v1/auth/session").expect(200);
    expect(res.body.user).toBeNull();
  });

  it("returns the signed-in user", async () => {
    const { agent, user } = await signupWeb();
    const res = await agent.get("/api/v1/auth/session").expect(200);
    expect(res.body.user.id).toBe(user.id);
  });

  it("renews the session when only the refresh cookie is left (access cookie expired)", async () => {
    const signup = await api()
      .post("/api/v1/auth/signup")
      .send({ name: "Lapsed Visitor", email: `lapsed.${Date.now()}@example.com`, phone: "9811100022", password: "Cakes1234", confirmPassword: "Cakes1234" })
      .expect(201);
    const refresh = cookieHeader(signup).find((c) => c.startsWith("ct_rt="))!.split(";")[0]!;
    // The browser drops ct_at after 15 minutes; only ct_rt is sent.
    const res = await api().get("/api/v1/auth/session").set("Cookie", refresh).expect(200);
    expect(res.body.user.email).toMatch(/^lapsed\./);
    const cookies = cookieHeader(res);
    expect(cookies.some((c) => c.startsWith("ct_at="))).toBe(true);
    expect(cookies.some((c) => c.startsWith("ct_rt=") && !c.includes(refresh.slice(6)))).toBe(true);
    // The old refresh token was rotated out and can't be used again.
    const again = await api().get("/api/v1/auth/session").set("Cookie", refresh).expect(200);
    expect(again.body.user).toBeNull();
  });
});
