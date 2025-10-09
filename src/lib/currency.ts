export const formatCurrency = (amountCents: number, currency: string) => {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      currencyDisplay: "symbol",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amountCents / 100);
  } catch {
    // Fallback for unsupported currency codes
    return `${currency} ${(amountCents / 100).toFixed(2)}`;
  }
};

export const parseCurrencyToCents = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value * 100);
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.replace(/[^0-9.,-]/g, "").replace(/,/g, "");
  if (!normalized) return null;
  const amount = Number(normalized);
  if (Number.isNaN(amount)) return null;
  return Math.round(amount * 100);
};
