"use client";

import { Clock, EggOff, Heart, Truck } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { DELIVERY, formatINR, type Product } from "@caketown/shared";
import { BakeArt } from "@/components/art/BakeArt";
import { Button } from "@/components/ui/Button";
import { Field, Input, OptionCards, Quantity, Switch } from "@/components/ui/form";
import { Price, Tag } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { nextDeliverySlot } from "@/lib/delivery";
import { flyToCart } from "@/lib/flyToCart";
import { toast, useAuth, useCart } from "@/lib/stores";
import styles from "./ProductDetail.module.css";

/* ---------- gallery with hover zoom ---------- */

export function Gallery({ product }: { product: Product }) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const image = product.images[active];

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || !image) return;
    const r = e.currentTarget.getBoundingClientRect();
    setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  };

  return (
    <div className={styles.gallery}>
      <div className={styles.stage} onPointerMove={onMove} onPointerLeave={() => setZoom(null)} id="product-art">
        {image ? (
          <img
            src={image.url}
            alt={image.alt ?? product.name}
            className={styles.photo}
            style={zoom ? { transform: "scale(1.8)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
          />
        ) : (
          <BakeArt name={product.name} category={product.category.slug} className={styles.art} title={product.name} />
        )}
      </div>
      {product.images.length > 1 && (
        <div className={styles.thumbs} role="tablist" aria-label="Photos">
          {product.images.map((img, i) => (
            <button key={img.url} role="tab" aria-selected={i === active} className={styles.thumb} onClick={() => setActive(i)} aria-label={`Photo ${i + 1}`}>
              <img src={img.url} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- options & add to cart ---------- */

export function ProductOptions({ product }: { product: Product }) {
  const firstInStock = product.variants.find((v) => v.inStock) ?? product.variants[0];
  const [variantId, setVariantId] = useState(firstInStock?.id);
  const [flavour, setFlavour] = useState(product.flavours[0] ?? "");
  const [eggless, setEggless] = useState(false);
  const [message, setMessage] = useState("");
  const [qty, setQty] = useState(1);
  const [saved, setSaved] = useState(false);
  const add = useCart((s) => s.add);
  const user = useAuth((s) => s.user);
  const busy = useRef(false);

  const variant = product.variants.find((v) => v.id === variantId);
  const unit = (variant?.price ?? 0) + (eggless ? product.egglessOption.extraPrice : 0);
  // Worked out after mount (uses the current time), so server and browser HTML match.
  const [slot, setSlot] = useState<ReturnType<typeof nextDeliverySlot> | null>(null);
  useEffect(() => setSlot(nextDeliverySlot(product.preparationHours)), [product.preparationHours]);
  const alreadyEggless = product.dietary.includes("eggless");

  const onAdd = () => {
    if (!variant || !variant.inStock || busy.current) return;
    busy.current = true;
    void flyToCart(document.querySelector("#product-art svg, #product-art img")).finally(() => (busy.current = false));
    add(
      {
        productId: product.id,
        variantId: variant.id,
        slug: product.slug,
        name: product.name,
        category: product.category.slug,
        variantLabel: variant.label,
        unitPrice: unit,
        eggless,
        ...(flavour && product.flavours.length ? { flavour } : {}),
        ...(message.trim() ? { message: message.trim() } : {}),
        image: product.images[0]?.url,
      },
      qty,
    );
    toast(`Added ${qty > 1 ? `${qty} × ` : ""}${product.name}`, {
      tone: "success",
      body: [variant.label, flavour && product.flavours.length ? flavour : null, eggless ? "eggless" : null].filter(Boolean).join(" · "),
    });
  };

  const onSave = async () => {
    if (!user) return toast("Sign in to save favourites");
    try {
      if (saved) await api.del(`/me/wishlist/${product.id}`);
      else await api.put(`/me/wishlist/${product.id}`);
      setSaved(!saved);
      toast(saved ? "Removed from favourites" : "Saved to favourites", { tone: "success" });
    } catch {
      toast("Couldn't update favourites", { tone: "error" });
    }
  };

  return (
    <div className={styles.options}>
      <p className={styles.livePrice} aria-live="polite">
        <Price value={unit * qty} />
        {qty > 1 && <span className="muted small"> ({formatINR(unit)} each)</span>}
      </p>

      {product.variants.length > 1 ? (
        <OptionCards
          name="size"
          legend={product.category.slug === "cakes" ? "Size" : "Pack"}
          columns={Math.min(3, product.variants.length)}
          value={variantId}
          onChange={setVariantId}
          options={product.variants.map((v) => ({
            value: v.id,
            label: v.label,
            detail: v.inStock ? formatINR(v.price) : "Sold out",
            disabled: !v.inStock,
          }))}
        />
      ) : variant && !variant.inStock ? (
        <p className={styles.soldOut}>Sold out for today. Check back tomorrow morning.</p>
      ) : null}

      {product.flavours.length > 0 && (
        <OptionCards name="flavour" legend="Flavour" value={flavour} onChange={setFlavour} columns={2} options={product.flavours.map((f) => ({ value: f, label: f }))} />
      )}

      {product.egglessOption.available && !alreadyEggless && (
        <Switch checked={eggless} onChange={setEggless} label="Make it eggless" detail={`+${formatINR(product.egglessOption.extraPrice)}, baked separately`} />
      )}

      {product.allowsMessage && (
        <Field label="Message on the cake" optional hint={`${message.length}/${product.maxMessageLength} characters, piped in chocolate`}>
          {(p) => <Input {...p} value={message} maxLength={product.maxMessageLength} placeholder="Happy birthday, Ma!" onChange={(e) => setMessage(e.target.value)} />}
        </Field>
      )}

      <div className={styles.buyRow}>
        <Quantity value={qty} onChange={setQty} />
        <Button size="lg" className={styles.addBtn} onClick={onAdd} disabled={!variant?.inStock}>
          {variant?.inStock ? "Add to cart" : "Sold out"}
        </Button>
        <button type="button" className={styles.save} onClick={onSave} aria-pressed={saved} aria-label={saved ? "Remove from favourites" : "Save to favourites"}>
          <Heart size={20} className={saved ? styles.saved : undefined} />
        </button>
      </div>

      <ul role="list" className={styles.facts}>
        <li>
          <Clock size={18} aria-hidden />
          <span>
            Earliest delivery <strong>{slot ? `${slot.day}, ${slot.label}` : "…"}</strong>
            {product.preparationHours >= 6 && <> · needs {product.preparationHours} hours to make</>}
          </span>
        </li>
        <li>
          <Truck size={18} aria-hidden />
          <span>Free delivery over {formatINR(DELIVERY.freeAbove)}, otherwise {formatINR(DELIVERY.fee)}</span>
        </li>
        {(alreadyEggless || product.egglessOption.available) && (
          <li>
            <EggOff size={18} aria-hidden />
            <span>{alreadyEggless ? "Made without eggs" : "Eggless version available"}</span>
          </li>
        )}
      </ul>
    </div>
  );
}

export function DietaryTags({ product }: { product: Product }) {
  const labels: Record<string, string> = { eggless: "Eggless", vegan: "Vegan", "gluten-free": "Gluten-free", "sugar-free": "No added sugar" };
  if (!product.dietary.length && !product.isBestseller) return null;
  return (
    <div className={styles.tags}>
      {product.isBestseller && <Tag tone="accent">Bestseller</Tag>}
      {product.dietary.map((d) => (
        <Tag key={d} tone="fresh">
          {labels[d] ?? d}
        </Tag>
      ))}
    </div>
  );
}
