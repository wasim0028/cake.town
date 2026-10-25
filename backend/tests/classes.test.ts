import { describe, expect, it } from "vitest";
import { BakingClass } from "../src/models";
import { api, makeAdmin, seedClass, signupWeb } from "./helpers";

describe("baking classes", () => {
  it("books seats, shows seats left and stops overbooking", async () => {
    const cls = await seedClass();
    const sessionId = String(cls.sessions[0]!._id);

    const list = await api().get("/api/v1/classes");
    const listed = list.body.items.find((c: { id: string }) => c.id === String(cls._id));
    expect(listed.sessions[0]).toMatchObject({ seats: 3, seatsLeft: 3 });

    const a = await signupWeb();
    const booked = await a.agent.post("/api/v1/bookings").send({ classId: String(cls._id), sessionId, seats: 2, paymentMethod: "pay_at_venue" });
    expect(booked.status).toBe(201);
    expect(booked.body.booking).toMatchObject({ status: "confirmed", amount: 2 * 249900, seats: 2 });

    const b = await signupWeb();
    const tooMany = await b.agent.post("/api/v1/bookings").send({ classId: String(cls._id), sessionId, seats: 2, paymentMethod: "pay_at_venue" });
    expect(tooMany.status).toBe(409);

    const detail = await api().get(`/api/v1/classes/${cls.slug}`);
    expect(detail.body.class.sessions[0].seatsLeft).toBe(1);

    // Cancelling (more than 24h before) frees the seats.
    const cancel = await a.agent.post(`/api/v1/bookings/${booked.body.booking.id}/cancel`);
    expect(cancel.status).toBe(200);
    expect((await BakingClass.findById(cls._id))!.sessions[0]!.booked).toBe(0);

    const mine = await a.agent.get("/api/v1/me/bookings");
    expect(mine.body.items[0].status).toBe("cancelled");
  });

  it("admin can create a class", async () => {
    const { agent } = await makeAdmin();
    const res = await agent.post("/api/v1/admin/classes").send({
      title: "Artisan Sourdough Workshop",
      instructor: { name: "Kabir" },
      durationMinutes: 240,
      price: 299900,
      sessions: [{ startsAt: new Date(Date.now() + 7 * 86400_000).toISOString(), seats: 8 }],
    });
    expect(res.status).toBe(201);
    expect(res.body.class.slug).toBe("artisan-sourdough-workshop");
  });
});

describe("misc", () => {
  it("health check reports which integrations are on", async () => {
    const res = await api().get("/health");
    expect(res.body).toMatchObject({ ok: true, features: { razorpay: true, cloudinary: false, redis: false } });
  });

  it("stores contact messages and newsletter signups", async () => {
    expect((await api().post("/api/v1/contact").send({ name: "Neel", email: "neel@example.com", message: "Do you deliver on Sundays?" })).status).toBe(201);
    expect((await api().post("/api/v1/newsletter").send({ email: "neel@example.com" })).status).toBe(201);
    expect((await api().post("/api/v1/newsletter").send({ email: "neel@example.com" })).status).toBe(201);
  });

  it("returns JSON errors for unknown routes and bad JSON", async () => {
    expect((await api().get("/api/v1/nope")).body.error.code).toBe("NOT_FOUND");
    const bad = await api().post("/api/v1/auth/login").set("Content-Type", "application/json").send("{bad json");
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe("BAD_JSON");
  });

  it("sets security headers and allows the web origin with credentials", async () => {
    const res = await api().get("/health").set("Origin", "http://localhost:3000");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
    const evil = await api().get("/health").set("Origin", "https://evil.example");
    expect(evil.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
