export const STAFF_ROLES = ["owner", "manager", "kitchen", "waiter"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const ORDER_STATUSES = [
  "new",
  "preparing",
  "ready",
  "served",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_MODES = ["online", "cash_table", "counter"] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];

export const PAYMENT_STATUSES = [
  "pending",
  "paid",
  "failed",
  "refunded",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const WAITER_CALL_STATUSES = [
  "open",
  "acknowledged",
  "resolved",
] as const;
export type WaiterCallStatus = (typeof WAITER_CALL_STATUSES)[number];

export const ROLE_HOME_ROUTES: Record<StaffRole, string> = {
  owner: "/admin",
  manager: "/admin",
  kitchen: "/kitchen",
  waiter: "/waiter",
};

export const ROLE_PERMISSIONS = {
  "admin:view": ["owner", "manager"],
  "menu:manage": ["owner", "manager"],
  "tables:manage": ["owner", "manager"],
  "orders:view": ["owner", "manager", "kitchen", "waiter"],
  "orders:prepare": ["owner", "manager", "kitchen"],
  "orders:serve": ["owner", "manager", "waiter"],
  "orders:cancel": ["owner", "manager"],
  "payments:view": ["owner", "manager"],
  "payments:collect_cash": ["owner", "manager", "waiter"],
  "payments:refund": ["owner"],
  "staff:view": ["owner", "manager"],
  "staff:manage": ["owner"],
  "reports:view": ["owner", "manager"],
  "settings:view": ["owner", "manager"],
  "settings:manage": ["owner"],
  "audit:view": ["owner"],
  "waiter_calls:view": ["owner", "manager", "kitchen", "waiter"],
  "waiter_calls:resolve": ["owner", "manager", "waiter"],
} as const satisfies Record<string, readonly StaffRole[]>;

export type Permission = keyof typeof ROLE_PERMISSIONS;
