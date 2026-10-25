import type { ErrorRequestHandler, RequestHandler } from "express";
import mongoose from "mongoose";
import { ZodError } from "zod";
import { MulterError } from "multer";
import { isProd } from "../config/env";
import { logger } from "../config/logger";
import { AppError } from "../utils/errors";

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ error: { code: "NOT_FOUND", message: `No route for ${req.method} ${req.path}` } });
};

/**
 * One place that turns every error into `{ error: { code, message, details? } }`.
 * Express 5 forwards rejected promises here, so no request is left hanging (old bug).
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
  }

  if (err instanceof ZodError) {
    const details: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const key = issue.path.join(".") || "_";
      (details[key] ??= []).push(issue.message);
    }
    const first = err.issues[0];
    return res.status(422).json({
      error: { code: "VALIDATION_ERROR", message: first ? first.message : "Invalid input", details },
    });
  }

  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ error: { code: "INVALID_ID", message: `Invalid ${err.path}` } });
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, [v.message]]));
    return res.status(422).json({ error: { code: "VALIDATION_ERROR", message: "Invalid data", details } });
  }

  if (err?.code === 11000) {
    const field = Object.keys(err.keyValue ?? {})[0] ?? "value";
    return res.status(409).json({ error: { code: "DUPLICATE", message: `That ${field} is already in use` } });
  }

  if (err instanceof MulterError) {
    return res.status(400).json({ error: { code: "UPLOAD_ERROR", message: err.message } });
  }

  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ error: { code: "BAD_JSON", message: "Request body is not valid JSON" } });
  }

  if (err?.type === "entity.too.large") {
    return res.status(413).json({ error: { code: "TOO_LARGE", message: "Request body is too large" } });
  }

  logger.error({ err, path: req.path, method: req.method }, "Unhandled error");
  res.status(500).json({
    error: { code: "INTERNAL", message: isProd ? "Something went wrong. Please try again." : String(err?.message ?? err) },
  });
};
