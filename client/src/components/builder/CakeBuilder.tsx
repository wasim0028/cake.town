"use client";

import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  CAKE_FROSTINGS,
  CAKE_SHAPES,
  CAKE_TOPPINGS,
  customCakeExtra,
  describeCustomization,
  formatINR,
  MAX_TOPPINGS,
  type CakeCustomization,
  type CakeFrostingId,
  type CakeShapeId,
  type CakeToppingId,
  type Product,
} from "@caketown/shared";
import { BuilderCake, SPONGE_COLORS } from "@/components/art/BuilderCake";
import { Button } from "@/components/ui/Button";
import { Chips, Field, Input, OptionCards, Switch } from "@/components/ui/form";
import { nextDeliverySlot } from "@/lib/delivery";
import { flyToCart } from "@/lib/flyToCart";
import { toast, useCart } from "@/lib/stores";
import styles from "./CakeBuilder.module.css";

const STEPS = ["Shape", "Size", "Sponge", "Frosting", "Toppings", "Finishing touches"] as const;

/** Counts smoothly to a new price instead of jumping. */
function AnimatedPrice({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setShown(value);
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 450);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(a + (value - a) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      from.current = value;
    };
  }, [value]);
  return <span className="tnum">{formatINR(Math.round(shown / 100) * 100)}</span>;
}

export function CakeBuilder({ product }: { product: Product }) {
  const [step, setStep] = useState(0);
  const [shape, setShape] = useState<CakeShapeId>("round");
  const [variantId, setVariantId] = useState(product.variants.find((v) => v.inStock)?.id ?? product.variants[0]!.id);
  const [sponge, setSponge] = useState(product.flavours[0] ?? "Vanilla");
  const [frosting, setFrosting] = useState<CakeFrostingId>("fresh-cream");
  const [toppings, setToppings] = useState<CakeToppingId[]>([]);
  const [message, setMessage] = useState("");
  const [eggless, setEggless] = useState(false);
  const [slot, setSlot] = useState<ReturnType<typeof nextDeliverySlot> | null>(null);
  const add = useCart((s) => s.add);
  const setCartOpen = useCart((s) => s.setOpen);
  const [added, setAdded] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => setSlot(nextDeliverySlot(product.preparationHours)), [product.preparationHours]);

  const variant = product.variants.find((v) => v.id === variantId)!;
  const custom: CakeCustomization = { shape, frosting, toppings };
  const price = variant.price + customCakeExtra(custom) + (eggless ? product.egglessOption.extraPrice : 0);
  const last = step === STEPS.length - 1;

  const go = (n: number) => {
    setStep(n);
    panel.current?.focus({ preventScroll: true });
    if (window.innerWidth < 900) panel.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const addToCart = () => {
    void flyToCart(document.querySelector("#builder-preview svg"));
    add({
      productId: product.id,
      variantId: variant.id,
      slug: product.slug,
      name: `Your ${shape} ${sponge.toLowerCase()} cake`,
      category: "cakes",
      variantLabel: variant.label,
      unitPrice: price,
      eggless,
      flavour: sponge,
      ...(message.trim() ? { message: message.trim() } : {}),
      custom,
      customSummary: describeCustomization(custom),
    });
    setAdded(true);
    toast("Your cake is in the cart", { tone: "success", body: `${variant.label} · ${formatINR(price)}` });
  };

  return (
    <div className={`container ${styles.builder}`}>
      <div className={styles.previewCol}>
        <div className={styles.preview} id="builder-preview">
          <BuilderCake shape={shape} sponge={sponge} frosting={frosting} toppings={toppings} message={message.trim()} />
        </div>
        <div className={styles.priceBar}>
          <div>
            <p className={styles.priceLabel}>Your cake</p>
            <p className={styles.price} aria-live="polite">
              <AnimatedPrice value={price} />
            </p>
          </div>
          <p className={styles.summary}>
            {variant.label} · {sponge} · {describeCustomization(custom)}
          </p>
        </div>
      </div>

      <div className={styles.panelCol}>
        <ol className={styles.progress} aria-label="Steps">
          {STEPS.map((s, i) => (
            <li key={s} data-state={i < step ? "done" : i === step ? "current" : "todo"}>
              <button type="button" onClick={() => go(i)} aria-current={i === step ? "step" : undefined}>
                <span className={styles.dot} aria-hidden>
                  {i < step ? <Check size={13} /> : i + 1}
                </span>
                <span className={styles.stepName}>{s}</span>
              </button>
            </li>
          ))}
        </ol>

        <div ref={panel} tabIndex={-1} className={styles.panel} key={step}>
          <h2 className={styles.stepTitle}>
            <span className="visually-hidden">Step {step + 1} of {STEPS.length}: </span>
            {
              [
                "Pick a shape",
                "How many people is it for?",
                "Choose the sponge",
                "Choose the frosting",
                `Add up to ${MAX_TOPPINGS} toppings`,
                "Add a message",
              ][step]
            }
          </h2>

          {step === 0 && (
            <OptionCards
              name="shape"
              legend="Shape"
              hideLegend
              value={shape}
              onChange={setShape}
              options={CAKE_SHAPES.map((s) => ({
                value: s.id,
                label: s.label,
                detail: s.price ? `+${formatINR(s.price)}` : "Included",
                visual: <ShapeIcon shape={s.id} />,
              }))}
            />
          )}

          {step === 1 && (
            <OptionCards
              name="size"
              legend="Size"
              hideLegend
              value={variantId}
              onChange={setVariantId}
              options={product.variants.map((v) => ({
                value: v.id,
                label: v.label,
                detail: v.inStock ? `${servings(v.weightGrams)} · ${formatINR(v.price)}` : "Not available today",
                disabled: !v.inStock,
              }))}
            />
          )}

          {step === 2 && (
            <OptionCards
              name="sponge"
              legend="Sponge"
              hideLegend
              columns={2}
              value={sponge}
              onChange={setSponge}
              options={product.flavours.map((f) => ({
                value: f,
                label: f,
                visual: <span className={styles.swatch} style={{ background: SPONGE_COLORS[f] ?? "#EBC98A" }} />,
              }))}
            />
          )}

          {step === 3 && (
            <OptionCards
              name="frosting"
              legend="Frosting"
              hideLegend
              columns={2}
              value={frosting}
              onChange={setFrosting}
              options={CAKE_FROSTINGS.map((f) => ({
                value: f.id,
                label: f.label,
                detail: f.price ? `+${formatINR(f.price)}` : "Included",
                visual: <span className={styles.swatch} style={{ background: f.color }} />,
              }))}
            />
          )}

          {step === 4 && (
            <>
              <Chips
                legend="Toppings"
                hideLegend
                value={toppings}
                onChange={setToppings}
                max={MAX_TOPPINGS}
                options={CAKE_TOPPINGS.map((t) => ({ value: t.id, label: `${t.label} · +${formatINR(t.price)}` }))}
              />
              <p className="muted small">
                {toppings.length}/{MAX_TOPPINGS} chosen. Toppings are optional.
              </p>
            </>
          )}

          {step === 5 && (
            <div className={styles.finish}>
              <Field label="Message on the cake" optional hint={`${message.length}/${product.maxMessageLength} characters, piped in chocolate`}>
                {(p) => <Input {...p} value={message} maxLength={product.maxMessageLength} placeholder="Happy birthday, Ma!" onChange={(e) => setMessage(e.target.value)} />}
              </Field>
              {product.egglessOption.available && (
                <Switch checked={eggless} onChange={setEggless} label="Make it eggless" detail={`+${formatINR(product.egglessOption.extraPrice)}`} />
              )}
              <p className={styles.slot}>
                Designed cakes take about {product.preparationHours} hours.{" "}
                {slot && (
                  <>
                    Earliest delivery: <strong>{slot.day}, {slot.label}</strong>. You&rsquo;ll pick the exact slot at checkout.
                  </>
                )}
              </p>
            </div>
          )}

          <div className={styles.nav}>
            {step > 0 && (
              <Button variant="ghost" onClick={() => go(step - 1)}>
                Back
              </Button>
            )}
            {!last ? (
              <Button onClick={() => go(step + 1)} size="lg">
                Next: {STEPS[step + 1]}
              </Button>
            ) : added ? (
              <>
                <Button size="lg" href="/checkout">
                  Go to checkout
                </Button>
                <Button variant="secondary" onClick={() => setCartOpen(true)}>
                  View cart
                </Button>
              </>
            ) : (
              <Button size="lg" onClick={addToCart}>
                Add to cart · {formatINR(price)}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function servings(grams?: number) {
  if (!grams) return "";
  const n = Math.round(grams / 100);
  return `serves ${Math.max(4, n - 1)}–${n + 1}`;
}

function ShapeIcon({ shape }: { shape: CakeShapeId }) {
  const d = {
    round: <ellipse cx="22" cy="22" rx="18" ry="18" />,
    square: <rect x="5" y="5" width="34" height="34" rx="5" />,
    heart: <path d="M22 38 C10 30 4 24 4 15 C4 9 9 5 14 5 C18 5 21 8 22 11 C23 8 26 5 30 5 C35 5 40 9 40 15 C40 24 34 30 22 38 Z" />,
  }[shape];
  return (
    <svg viewBox="0 0 44 44" fill="var(--plate)" stroke="var(--text)" strokeWidth="2">
      {d}
    </svg>
  );
}
