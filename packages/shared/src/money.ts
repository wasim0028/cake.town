/** Convert rupees (e.g. 899 or 899.5) to integer paise. */
export function toPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/** Convert integer paise to rupees. */
export function fromPaise(paise: number): number {
  return paise / 100;
}

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** 89900 -> "₹899" ; 89950 -> "₹899.50" */
export function formatINR(paise: number): string {
  const rupees = fromPaise(paise);
  if (Number.isInteger(rupees)) return inr.format(rupees);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}
