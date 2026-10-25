import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { env, features } from "../config/env";
import { logger } from "../config/logger";
import { unavailable } from "../utils/errors";

let configured = false;

function client() {
  if (!features.cloudinary) throw unavailable("Image uploads are not configured yet (add Cloudinary keys).", "UPLOADS_DISABLED");
  if (!configured) {
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    configured = true;
  }
  return cloudinary;
}

export interface UploadedImage {
  url: string;
  publicId: string;
  width: number;
  height: number;
}

/** Folders live under CLOUDINARY_FOLDER, e.g. caketown/products. */
export type ImageFolder = "products" | "categories" | "classes" | "avatars" | "misc";

export function uploadImage(buffer: Buffer, folder: ImageFolder): Promise<UploadedImage> {
  const cld = client();
  return new Promise((resolve, reject) => {
    const stream = cld.uploader.upload_stream(
      {
        folder: `${env.CLOUDINARY_FOLDER}/${folder}`,
        resource_type: "image",
        // Keep originals reasonable; delivery URLs add f_auto,q_auto and sizing.
        transformation: [{ width: 2400, height: 2400, crop: "limit" }],
      },
      (err, result?: UploadApiResponse) => {
        if (err || !result) return reject(err ?? new Error("Upload failed"));
        resolve({ url: result.secure_url, publicId: result.public_id, width: result.width, height: result.height });
      },
    );
    stream.end(buffer);
  });
}

/** Best-effort delete; a failed cleanup must never fail the request that triggered it. */
export async function deleteImages(publicIds: (string | undefined | null)[]): Promise<void> {
  const ids = publicIds.filter((id): id is string => Boolean(id));
  if (!ids.length || !features.cloudinary) return;
  try {
    await client().api.delete_resources(ids, { resource_type: "image" });
  } catch (err) {
    logger.warn({ err, ids }, "Cloudinary delete failed");
  }
}

/**
 * Delivery URL with automatic format (WebP/AVIF) and quality, optionally resized.
 * Works on any Cloudinary URL; other URLs are returned unchanged.
 */
export function optimizedUrl(url: string, width?: number): string {
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url;
  const t = ["f_auto", "q_auto", ...(width ? [`w_${width}`, "c_limit"] : [])].join(",");
  return url.replace("/upload/", `/upload/${t}/`);
}
