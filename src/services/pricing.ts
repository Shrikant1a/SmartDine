export interface PriceableLineItem {
  unitPrice: number;
  addonsPrices: number[];
  gstPercent: number;
  quantity: number;
}

export interface LinePricingResult {
  unitPrice: number;
  addonsTotal: number;
  lineSubtotal: number;
  lineTax: number;
}

export interface OrderPricingResult {
  subtotal: number;
  taxAmount: number;
  serviceCharge: number;
  totalAmount: number;
  lines: LinePricingResult[];
}

export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateLinePricing(item: PriceableLineItem): LinePricingResult {
  if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
    throw new Error("Item quantity must be a positive integer");
  }
  if (item.unitPrice < 0 || item.gstPercent < 0) {
    throw new Error("Prices and tax percentages cannot be negative");
  }

  const addonsTotal = roundCurrency(
    item.addonsPrices.reduce((sum, p) => {
      if (p < 0) throw new Error("Add-on price cannot be negative");
      return sum + p;
    }, 0),
  );

  const lineSubtotal = roundCurrency((item.unitPrice + addonsTotal) * item.quantity);
  const lineTax = roundCurrency((lineSubtotal * item.gstPercent) / 100);

  return {
    unitPrice: roundCurrency(item.unitPrice),
    addonsTotal,
    lineSubtotal,
    lineTax,
  };
}

export function calculateOrderPricing(
  items: PriceableLineItem[],
  serviceChargePercent = 0,
): OrderPricingResult {
  if (items.length === 0) {
    throw new Error("Cannot calculate pricing for an empty order");
  }
  if (serviceChargePercent < 0) {
    throw new Error("Service charge percentage cannot be negative");
  }

  const lines = items.map(calculateLinePricing);
  const subtotal = roundCurrency(lines.reduce((sum, l) => sum + l.lineSubtotal, 0));
  const taxAmount = roundCurrency(lines.reduce((sum, l) => sum + l.lineTax, 0));
  const serviceCharge = roundCurrency((subtotal * serviceChargePercent) / 100);
  const totalAmount = roundCurrency(subtotal + taxAmount + serviceCharge);

  return {
    subtotal,
    taxAmount,
    serviceCharge,
    totalAmount,
    lines,
  };
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
