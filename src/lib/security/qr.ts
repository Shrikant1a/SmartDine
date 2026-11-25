import "server-only";
import crypto from "node:crypto";

export const TABLE_SESSION_COOKIE_NAME = "sd_table_session";
const TABLE_SESSION_TTL_SECONDS = 60 * 60 * 6; // 6 hours per dining session

export interface TableSessionPayload {
  tableId: string;
  restaurantId: string;
  tableNumber: string;
  tokenVersion: number;
  exp: number;
}

/**
 * Generates a high-entropy URL-safe random QR token (256 bits).
 */
export function generateRawQrToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/**
 * Derives the stored database hash for a raw QR token using HMAC-SHA256.
 * Raw tokens are never stored in restaurant_tables.
 */
export function hashQrToken(rawToken: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(rawToken).digest("hex");
}

/**
 * Signs a table dining session payload into an HMAC-authenticated token for an HttpOnly cookie.
 */
export function signTableSession(
  payload: Omit<TableSessionPayload, "exp">,
  secret: string,
  ttlSeconds = TABLE_SESSION_TTL_SECONDS,
): string {
  const fullPayload: TableSessionPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const encoded = Buffer.from(JSON.stringify(fullPayload), "utf8").toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

/**
 * Verifies and decodes a signed table session cookie using constant-time signature comparison.
 */
export function verifyTableSession(
  token: string,
  secret: string,
): TableSessionPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [encoded, signature] = parts;
  if (!encoded || !signature) return null;

  const expectedSig = crypto.createHmac("sha256", secret).update(encoded).digest("base64url");
  const sigBuf = Buffer.from(signature, "utf8");
  const expectedBuf = Buffer.from(expectedSig, "utf8");

  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const decoded = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as TableSessionPayload;

    if (
      !decoded.tableId ||
      !decoded.restaurantId ||
      !decoded.tableNumber ||
      typeof decoded.tokenVersion !== "number" ||
      typeof decoded.exp !== "number"
    ) {
      return null;
    }

    if (decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}
