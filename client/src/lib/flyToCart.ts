"use client";

/**
 * Sends a copy of the product picture on a curved flight into the cart icon, so people see
 * where their item went. The cart badge then bumps (driven by the cart store).
 */
export function flyToCart(source: Element | null): Promise<void> {
  const target = document.getElementById("cart-button");
  if (!source || !target || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return Promise.resolve();

  const from = source.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  const clone = source.cloneNode(true) as HTMLElement;
  const size = Math.min(from.width, 140);

  Object.assign(clone.style, {
    position: "fixed",
    left: `${from.left + from.width / 2 - size / 2}px`,
    top: `${from.top + from.height / 2 - size / 2}px`,
    width: `${size}px`,
    height: `${size}px`,
    margin: "0",
    zIndex: "95",
    pointerEvents: "none",
    borderRadius: "50%",
    willChange: "transform, opacity",
  });
  clone.removeAttribute("id");
  clone.setAttribute("aria-hidden", "true");
  document.body.appendChild(clone);

  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  // A rising arc: lift first, then drop into the bag.
  const lift = Math.min(-80, dy - 60);

  const anim = clone.animate(
    [
      { transform: "translate(0, 0) scale(1) rotate(0deg)", opacity: 1, offset: 0 },
      { transform: `translate(${dx * 0.35}px, ${lift}px) scale(0.7) rotate(-12deg)`, opacity: 1, offset: 0.45 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.12) rotate(8deg)`, opacity: 0.6, offset: 1 },
    ],
    { duration: 720, easing: "cubic-bezier(0.55, 0, 0.35, 1)", fill: "forwards" },
  );
  return anim.finished.then(() => clone.remove()).catch(() => clone.remove());
}
