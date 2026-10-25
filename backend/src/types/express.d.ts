import type { Role } from "@caketown/shared";

declare global {
  namespace Express {
    interface Request {
      /** Set by the auth middleware. */
      user?: { id: string; role: Role };
    }
  }
}

export {};
