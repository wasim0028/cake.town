"use client";

/* eslint-disable @next/next/no-img-element -- admin previews can be any URL, not only Cloudinary */
import { ArrowLeft, ArrowRight, ImagePlus, Link2, X } from "lucide-react";
import { useRef, useState } from "react";
import type { Image } from "@caketown/shared";
import { Input } from "@/components/ui/form";
import { api, ApiError } from "@/lib/api";
import styles from "./ImagePicker.module.css";

type Folder = "products" | "categories" | "classes";

/**
 * Upload to Cloudinary through the API, or paste an image URL (handy before Cloudinary keys are set).
 * The first image is the cover. `max` 1 makes it a single-image picker.
 */
export function ImagePicker({ value, onChange, folder, max = 10, label = "Photos" }: { value: Image[]; onChange: (v: Image[]) => void; folder: Folder; max?: number; label?: string }) {
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [url, setUrl] = useState("");
  const room = max - value.length;

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = [...files].slice(0, Math.min(room, 6));
    const tooBig = list.find((f) => f.size > 5 * 1024 * 1024);
    if (tooBig) return setError(`${tooBig.name} is over 5 MB.`);
    const form = new FormData();
    list.forEach((f) => form.append("images", f));
    setBusy(true);
    setError(undefined);
    try {
      const r = await api.upload<{ images: { url: string; publicId: string }[] }>(`/admin/uploads?folder=${folder}`, form);
      onChange([...value, ...r.images.map((i) => ({ url: i.url, publicId: i.publicId }))]);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (file.current) file.current.value = "";
    }
  };

  const addUrl = () => {
    try {
      const u = new URL(url.trim());
      if (u.protocol !== "https:") throw new Error();
      onChange([...value, { url: u.toString() }]);
      setUrl("");
      setError(undefined);
    } catch {
      setError("Paste a full https:// image link.");
    }
  };

  const move = (i: number, d: number) => {
    const next = [...value];
    [next[i], next[i + d]] = [next[i + d]!, next[i]!];
    onChange(next);
  };

  return (
    <fieldset className={styles.wrap}>
      <legend className={styles.legend}>{label}</legend>
      <div className={styles.grid}>
        {value.map((img, i) => (
          <figure key={img.publicId ?? img.url} className={styles.thumb}>
            <img src={img.url} alt={img.alt ?? ""} />
            {i === 0 && max > 1 && <span className={styles.cover}>Cover</span>}
            <div className={styles.tools}>
              {max > 1 && (
                <>
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move earlier"><ArrowLeft size={14} /></button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === value.length - 1} aria-label="Move later"><ArrowRight size={14} /></button>
                </>
              )}
              <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Remove photo"><X size={14} /></button>
            </div>
            <input
              className={styles.alt}
              placeholder="Describe the photo"
              aria-label={`Description for photo ${i + 1}`}
              value={img.alt ?? ""}
              maxLength={160}
              onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, alt: e.target.value || undefined } : x)))}
            />
          </figure>
        ))}
        {room > 0 && (
          <button type="button" className={styles.add} onClick={() => file.current?.click()} disabled={busy} aria-busy={busy}>
            <ImagePlus size={22} />
            <span>{busy ? "Uploading…" : max > 1 ? "Upload photos" : "Upload photo"}</span>
            <span className="small muted">JPG, PNG or WebP, up to 5 MB</span>
          </button>
        )}
      </div>
      <input ref={file} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple={max > 1} hidden onChange={(e) => upload(e.target.files)} />
      {room > 0 && (
        <div className={styles.urlRow}>
          <Link2 size={16} aria-hidden />
          <Input placeholder="…or paste an image link" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addUrl())} aria-label="Image link" />
          <button type="button" className="text-link small" onClick={addUrl} disabled={!url.trim()}>Add</button>
        </div>
      )}
      {error && <p className={styles.error} role="alert">{error}</p>}
    </fieldset>
  );
}
