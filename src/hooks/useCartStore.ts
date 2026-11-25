"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartAddonSelection {
  id: string;
  name: string;
  price: number;
}

export interface CartEntry {
  cartKey: string;
  menuItemId: string;
  name: string;
  imageUrl: string | null;
  isVeg: boolean;
  gstPercent: number;
  variantId: string | null;
  variantName: string | null;
  unitPrice: number;
  addons: CartAddonSelection[];
  quantity: number;
  specialInstructions: string;
}

interface CartState {
  tableId: string | null;
  tableNumber: string | null;
  menuPath: string | null;
  items: CartEntry[];
  setTableContext: (tableId: string, tableNumber: string, menuPath: string) => void;
  addItem: (entry: Omit<CartEntry, "cartKey">) => void;
  updateItem: (oldCartKey: string, entry: Omit<CartEntry, "cartKey">) => void;
  updateQuantity: (cartKey: string, delta: number) => void;
  removeItem: (cartKey: string) => void;
  clearCart: () => void;
}

export function buildCartKey(
  menuItemId: string,
  variantId: string | null,
  addonIds: string[],
  specialInstructions: string,
): string {
  const sortedAddons = [...addonIds].sort().join(",");
  return `${menuItemId}::${variantId ?? "base"}::${sortedAddons}::${specialInstructions.trim()}`;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      tableId: null,
      tableNumber: null,
      menuPath: null,
      items: [],

      setTableContext: (tableId, tableNumber, menuPath) =>
        set((state) => {
          if (state.tableId && state.tableId !== tableId) {
            return { tableId, tableNumber, menuPath, items: [] };
          }
          return { tableId, tableNumber, menuPath };
        }),

      addItem: (entry) =>
        set((state) => {
          const cartKey = buildCartKey(
            entry.menuItemId,
            entry.variantId,
            entry.addons.map((a) => a.id),
            entry.specialInstructions,
          );
          const existing = state.items.find((i) => i.cartKey === cartKey);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.cartKey === cartKey
                  ? { ...i, quantity: Math.min(50, i.quantity + entry.quantity) }
                  : i,
              ),
            };
          }
          return { items: [...state.items, { ...entry, cartKey }] };
        }),

      updateItem: (oldCartKey, entry) =>
        set((state) => {
          const newKey = buildCartKey(
            entry.menuItemId,
            entry.variantId,
            entry.addons.map((a) => a.id),
            entry.specialInstructions,
          );
          const remaining = state.items.filter((i) => i.cartKey !== oldCartKey);
          const duplicate = remaining.find((i) => i.cartKey === newKey);
          if (duplicate) {
            return {
              items: remaining.map((i) =>
                i.cartKey === newKey
                  ? { ...i, quantity: Math.min(50, i.quantity + entry.quantity) }
                  : i,
              ),
            };
          }
          return { items: [...remaining, { ...entry, cartKey: newKey }] };
        }),

      updateQuantity: (cartKey, delta) =>
        set((state) => ({
          items: state.items
            .map((i) =>
              i.cartKey === cartKey ? { ...i, quantity: i.quantity + delta } : i,
            )
            .filter((i) => i.quantity > 0 && i.quantity <= 50),
        })),

      removeItem: (cartKey) =>
        set((state) => ({
          items: state.items.filter((i) => i.cartKey !== cartKey),
        })),

      clearCart: () => set({ items: [] }),
    }),
    {
      name: "smartdine-cart-v1",
    },
  ),
);
