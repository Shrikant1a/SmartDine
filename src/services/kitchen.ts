import type { OrderStatus, StaffRole } from "@/constants/roles";
import type { Order, OrderItem, WaiterCall } from "@/types/database";

export interface KitchenOrderView extends Order {
  table_number: string;
  table_label: string | null;
  items: OrderItem[];
}

export interface KitchenWaiterCallView extends WaiterCall {
  table_number: string;
  table_label: string | null;
}

export type ElapsedSeverity = "normal" | "warning" | "urgent";

const VALID_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  new: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["served", "cancelled"],
  served: [],
  cancelled: [],
};

/**
 * Validates whether a staff role is permitted to transition an order from `fromStatus` to `toStatus`.
 */
export function canStaffTransitionOrder(
  role: StaffRole,
  fromStatus: OrderStatus,
  toStatus: OrderStatus,
): { allowed: boolean; reason?: string } {
  if (fromStatus === toStatus) {
    return { allowed: false, reason: `Order is already ${toStatus}` };
  }

  const allowedNext = VALID_TRANSITIONS[fromStatus];
  if (!allowedNext.includes(toStatus)) {
    return {
      allowed: false,
      reason: `Cannot transition order from "${fromStatus}" to "${toStatus}"`,
    };
  }

  if (role === "kitchen") {
    const kitchenAllowed =
      (fromStatus === "new" && toStatus === "preparing") ||
      (fromStatus === "preparing" && toStatus === "ready");
    if (!kitchenAllowed) {
      return {
        allowed: false,
        reason: "Kitchen staff can only move orders from New -> Preparing -> Ready",
      };
    }
  } else if (role === "waiter") {
    if (!(fromStatus === "ready" && toStatus === "served")) {
      return {
        allowed: false,
        reason: "Waiters can only mark Ready orders as Served",
      };
    }
  } else if (role !== "owner" && role !== "manager") {
    return { allowed: false, reason: "Unauthorized role" };
  }

  return { allowed: true };
}

/**
 * Computes elapsed minutes since order creation and classifies urgency for KDS color coding.
 */
export function getElapsedInfo(
  createdAtIso: string,
  nowMs = Date.now(),
): { minutes: number; label: string; severity: ElapsedSeverity } {
  const createdMs = new Date(createdAtIso).getTime();
  if (Number.isNaN(createdMs)) {
    return { minutes: 0, label: "0m", severity: "normal" };
  }
  const diffMins = Math.max(0, Math.floor((nowMs - createdMs) / 60_000));
  const severity: ElapsedSeverity =
    diffMins >= 20 ? "urgent" : diffMins >= 10 ? "warning" : "normal";

  if (diffMins < 1) {
    return { minutes: 0, label: "Just now", severity: "normal" };
  }
  if (diffMins >= 60) {
    const hrs = Math.floor(diffMins / 60);
    const rem = diffMins % 60;
    return { minutes: diffMins, label: `${hrs}h ${rem}m`, severity };
  }
  return { minutes: diffMins, label: `${diffMins}m`, severity };
}

export type TimeWindowFilter = "all" | "15m" | "1h" | "today";

export function matchesTimeFilter(
  createdAtIso: string,
  filter: TimeWindowFilter,
  nowMs = Date.now(),
): boolean {
  if (filter === "all") return true;
  const createdMs = new Date(createdAtIso).getTime();
  if (Number.isNaN(createdMs)) return false;

  if (filter === "15m") {
    return nowMs - createdMs <= 15 * 60_000;
  }
  if (filter === "1h") {
    return nowMs - createdMs <= 60 * 60_000;
  }
  if (filter === "today") {
    const nowDate = new Date(nowMs);
    const createdDate = new Date(createdMs);
    return (
      nowDate.getFullYear() === createdDate.getFullYear() &&
      nowDate.getMonth() === createdDate.getMonth() &&
      nowDate.getDate() === createdDate.getDate()
    );
  }
  return true;
}
