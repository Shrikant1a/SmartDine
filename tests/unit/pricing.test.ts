import { describe, expect, it } from "vitest";
import {
  calculateLinePricing,
  calculateOrderPricing,
  formatINR,
} from "@/services/pricing";

describe("Server-side pricing & GST calculator", () => {
  it("calculates variant + add-on + quantity + 5% GST accurately (Paneer Pizza example)", () => {
    // Medium Paneer Pizza ₹249 + Extra Cheese ₹40 = ₹289 * 2 = ₹578, GST 5% = ₹28.90
    const line = calculateLinePricing({
      unitPrice: 249,
      addonsPrices: [40],
      gstPercent: 5,
      quantity: 2,
    });

    expect(line.unitPrice).toBe(249);
    expect(line.addonsTotal).toBe(40);
    expect(line.lineSubtotal).toBe(578);
    expect(line.lineTax).toBe(28.9);
  });

  it("calculates multi-item order subtotal, tax, service charge, and grand total", () => {
    const order = calculateOrderPricing(
      [
        { unitPrice: 149, addonsPrices: [40], gstPercent: 5, quantity: 1 }, // 189 + 9.45
        { unitPrice: 99, addonsPrices: [], gstPercent: 5, quantity: 2 }, // 198 + 9.90
      ],
      0,
    );

    expect(order.subtotal).toBe(387);
    expect(order.taxAmount).toBe(19.35);
    expect(order.serviceCharge).toBe(0);
    expect(order.totalAmount).toBe(406.35);
  });

  it("rejects non-positive quantities and negative prices", () => {
    expect(() =>
      calculateLinePricing({
        unitPrice: 100,
        addonsPrices: [],
        gstPercent: 5,
        quantity: 0,
      }),
    ).toThrow();

    expect(() =>
      calculateLinePricing({
        unitPrice: -50,
        addonsPrices: [],
        gstPercent: 5,
        quantity: 1,
      }),
    ).toThrow();
  });

  it("formats INR values cleanly", () => {
    expect(formatINR(249)).toContain("249");
    expect(formatINR(406.35)).toContain("406.35");
  });
});
