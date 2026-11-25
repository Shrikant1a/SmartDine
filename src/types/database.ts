import type {
  OrderStatus,
  PaymentMode,
  PaymentStatus,
  StaffRole,
  WaiterCallStatus,
} from "@/constants/roles";

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  address: string | null;
  phone: string | null;
  gst_number: string | null;
  default_gst_percent: number;
  service_charge_percent: number;
  wifi_ssid: string | null;
  wifi_password: string | null;
  google_review_url: string | null;
  owner_whatsapp: string | null;
  kitchen_whatsapp: string | null;
  is_open: boolean;
  created_at: string;
  updated_at: string;
}

export interface StaffMember {
  id: string;
  user_id: string;
  restaurant_id: string;
  name: string;
  email: string;
  phone: string | null;
  role: StaffRole;
  permissions: Record<string, boolean>;
  is_active: boolean;
  last_active_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RestaurantTable {
  id: string;
  restaurant_id: string;
  table_number: string;
  label: string | null;
  capacity: number;
  qr_token_hash: string;
  token_version: number;
  status: "available" | "occupied" | "reserved" | "inactive";
  assigned_waiter_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  category_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  base_price: number;
  gst_percent: number;
  is_veg: boolean;
  is_recommended: boolean;
  is_popular: boolean;
  is_available: boolean;
  is_archived: boolean;
  stock_qty: number | null;
  low_stock_threshold: number;
  prep_time_mins: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface MenuItemVariant {
  id: string;
  menu_item_id: string;
  name: string;
  price: number;
  is_default: boolean;
  is_available: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface MenuItemAddon {
  id: string;
  menu_item_id: string;
  name: string;
  price: number;
  is_available: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  restaurant_id: string;
  table_id: string;
  order_number: string;
  idempotency_key: string | null;
  status: OrderStatus;
  payment_mode: PaymentMode;
  payment_status: PaymentStatus;
  subtotal: number;
  tax_amount: number;
  service_charge: number;
  total_amount: number;
  customer_name: string | null;
  customer_phone: string | null;
  special_instructions: string | null;
  accepted_at: string | null;
  ready_at: string | null;
  served_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItemAddonSnapshot {
  id: string;
  name: string;
  price: number;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  item_name_snapshot: string;
  variant_name_snapshot: string | null;
  addons_snapshot: OrderItemAddonSnapshot[];
  unit_price_snapshot: number;
  addons_total_snapshot: number;
  gst_percent_snapshot: number;
  quantity: number;
  line_total: number;
  special_instructions: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  restaurant_id: string;
  order_id: string;
  provider: "razorpay" | "cash" | "counter";
  payment_mode: PaymentMode;
  provider_order_id: string | null;
  provider_payment_id: string | null;
  provider_event_id: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  raw_payload: Record<string, unknown> | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WaiterCall {
  id: string;
  restaurant_id: string;
  table_id: string;
  status: WaiterCallStatus;
  note: string | null;
  acknowledged_by: string | null;
  resolved_by: string | null;
  created_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
}

export interface Review {
  id: string;
  restaurant_id: string;
  order_id: string;
  rating: number;
  comment: string | null;
  allow_edit: boolean;
  clicked_google_review: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationLog {
  id: string;
  restaurant_id: string;
  order_id: string | null;
  channel: "whatsapp" | "system";
  event_type: string;
  recipient: string;
  template_name: string | null;
  payload: Record<string, unknown> | null;
  status: "queued" | "sent" | "failed" | "skipped";
  provider_message_id: string | null;
  error_message: string | null;
  retry_count: number;
  sent_at: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  restaurant_id: string;
  staff_id: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}
