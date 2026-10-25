"use client";

import Link from "next/link";
import { Heart, Plus } from "lucide-react";
import { useRef, useState } from "react";
import { formatINR, type Product } from "@caketown/shared";
import { BakeArt } from "@/components/art/BakeArt";
import { Price, Tag } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { flyToCart } from "@/lib/flyToCart";
import { toast, useAuth, useCart } from "@/lib/stores";
import styles from "./ProductPlate.module.css";

/**
 * A product served on a plate: the picture (or our illustration) sits on a round crumb-coloured
 * plate instead of a card. "+" adds the first size that's in stock; the product page has
 * every option.
 */
export function ProductPlate({ product, priority = false }: { product: Product; priority?: boolean }) {
  const art = useRef<HTMLDivElement>(null);
  const add = useCart((s) => s.add);
  const user = useAuth((s) => s.user);
  const [saved, setSaved] = useState(false);
  const [burst, setBurst] = useState(0);

  const variant = product.variants.find((v) => v.inStock);
  const image = product.images[0];
  const eggless = product.dietary.includes("eggless");

  const onAdd = () => {
    if (!variant) return;
    void flyToCart(art.current);
    add({
      productId: product.id,
      variantId: variant.id,
      slug: product.slug,
      name: product.name,
      category: product.category.slug,
      variantLabel: variant.label,
      unitPrice: variant.price,
      image: image?.url,
    });
    toast(`Added ${product.name}`, { body: `${variant.label} · ${formatINR(variant.price)}`, tone: "success" });
  };

  const onSave = async () => {
    if (!user) {
      toast("Sign in to save favourites", { body: "Your saved items follow you to the app too." });
      return;
    }
    const next = !saved;
    setSaved(next);
    if (next) setBurst((b) => b + 1);
    try {
      if (next) await api.put(`/me/wishlist/${product.id}`);
      else await api.del(`/me/wishlist/${product.id}`);
    } catch {
      setSaved(!next);
      toast("Couldn't update your favourites", { tone: "error", body: "Check your connection and try again." });
    }
  };

  return (
    <article className={styles.plate}>
      <div className={styles.dish}>
        <Link href={`/product/${product.slug}`} className={styles.dishLink} aria-label={product.name} tabIndex={-1}>
          <div ref={art} className={styles.art}>
            {image ? (
              <img src={image.url} alt={image.alt ?? ""} loading={priority ? "eager" : "lazy"} decoding="async" />
            ) : (
              <BakeArt name={product.name} category={product.category.slug} />
            )}
          </div>
        </Link>
        <button
          type="button"
          className={styles.save}
          aria-pressed={saved}
          aria-label={saved ? `Remove ${product.name} from favourites` : `Save ${product.name} to favourites`}
          onClick={onSave}
        >
          <Heart key={burst} size={18} className={saved ? styles.heartOn : undefined} />
          {burst > 0 && saved && (
            <span key={`b${burst}`} className={styles.burst} aria-hidden>
              {[0, 60, 120, 180, 240, 300].map((a) => (
                <i key={a} style={{ "--a": `${a}deg` } as React.CSSProperties} />
              ))}
            </span>
          )}
        </button>
        <button
          type="button"
          className={styles.add}
          onClick={onAdd}
          disabled={!variant}
          aria-label={variant ? `Add ${product.name}, ${variant.label}, to cart` : `${product.name} is sold out`}
        >
          <Plus size={20} />
          <span>{variant ? "Add" : "Sold out"}</span>
        </button>
      </div>

      <div className={styles.body}>
        <h3 className={styles.name}>
          <Link href={`/product/${product.slug}`}>{product.name}</Link>
        </h3>
        {product.shortDescription && <p className={styles.desc}>{product.shortDescription}</p>}
        <div className={styles.meta}>
          <Price value={product.priceFrom} from={product.variants.length > 1} />
          {eggless ? <Tag tone="fresh">Eggless</Tag> : product.egglessOption.available ? <Tag tone="fresh">Eggless option</Tag> : null}
        </div>
      </div>
    </article>
  );
}
