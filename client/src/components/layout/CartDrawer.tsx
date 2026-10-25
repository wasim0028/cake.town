"use client";

import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { DELIVERY, formatINR } from "@caketown/shared";
import { BakeArt } from "@/components/art/BakeArt";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { cartSubtotal, useCart } from "@/lib/stores";
import styles from "./CartDrawer.module.css";

export function CartDrawer() {
  const { items, open, setOpen, setQuantity, remove } = useCart();
  const subtotal = cartSubtotal(items);
  const toFree = Math.max(0, DELIVERY.freeAbove - subtotal);
  const progress = Math.min(1, subtotal / DELIVERY.freeAbove);
  const close = () => setOpen(false);

  return (
    <Drawer
      open={open}
      onClose={close}
      title="Your cart"
      footer={
        items.length ? (
          <div className={styles.summary}>
            <div className={styles.freeDelivery}>
              <p>{toFree > 0 ? <>Add {formatINR(toFree)} more for free delivery</> : <>Delivery is free on this order</>}</p>
              <div className={styles.meter} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-label="Progress to free delivery">
                <span style={{ transform: `scaleX(${progress})` }} />
              </div>
            </div>
            <div className={styles.row}>
              <span>Subtotal</span>
              <strong className="tnum">{formatINR(subtotal)}</strong>
            </div>
            <p className={styles.note}>Delivery fee and coupons are worked out at checkout.</p>
            <Button href="/checkout" size="lg" block onClick={close}>
              Choose a delivery slot
            </Button>
          </div>
        ) : null
      }
    >
      {items.length === 0 ? (
        <div className={styles.empty}>
          <BakeArt name="Butter Croissant" category="pastries" className={styles.emptyArt} />
          <p className={styles.emptyTitle}>Nothing in your cart yet</p>
          <p className="muted">Today&rsquo;s bestsellers are a good place to start.</p>
          <Button href="/shop" variant="secondary" onClick={close}>
            Browse the menu
          </Button>
        </div>
      ) : (
        <ul role="list" className={styles.list}>
          {items.map((item) => (
            <li key={item.key} className={styles.item}>
              <Link href={`/product/${item.slug}`} className={styles.thumb} onClick={close} aria-hidden tabIndex={-1}>
                {item.image ? <img src={item.image} alt="" /> : <BakeArt name={item.name} category={item.category} />}
              </Link>
              <div className={styles.info}>
                <Link href={`/product/${item.slug}`} className={styles.name} onClick={close}>
                  {item.name}
                </Link>
                <p className={styles.meta}>
                  {item.variantLabel}
                  {item.eggless && " · eggless"}
                </p>
                {item.message && <p className={styles.meta}>“{item.message}”</p>}
                <div className={styles.controls}>
                  <div className={styles.stepper}>
                    <button type="button" onClick={() => setQuantity(item.key, item.quantity - 1)} disabled={item.quantity <= 1} aria-label={`One less ${item.name}`}>
                      <Minus size={15} />
                    </button>
                    <span className="tnum" aria-live="polite" aria-label={`Quantity ${item.quantity}`}>
                      {item.quantity}
                    </span>
                    <button type="button" onClick={() => setQuantity(item.key, item.quantity + 1)} disabled={item.quantity >= 20} aria-label={`One more ${item.name}`}>
                      <Plus size={15} />
                    </button>
                  </div>
                  <strong className="tnum">{formatINR(item.unitPrice * item.quantity)}</strong>
                </div>
              </div>
              <button type="button" className={styles.remove} onClick={() => remove(item.key)} aria-label={`Remove ${item.name}`}>
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Drawer>
  );
}
