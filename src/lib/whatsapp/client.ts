import "server-only";

export interface WhatsAppTemplateRequest {
  to: string;
  templateName: string;
  languageCode?: string;
  bodyParameters: string[];
}

export interface WhatsAppSendResult {
  status: "sent" | "failed" | "skipped";
  providerMessageId?: string;
  errorMessage?: string;
}

export function isWhatsAppConfigured(): boolean {
  return Boolean(
    process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID,
  );
}

/**
 * Normalizes phone numbers to digits-only E.164 format expected by Meta Graph API.
 * Defaults 10-digit Indian mobile numbers to country code 91.
 */
export function normalizeWhatsAppPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return `91${digits}`;
  }
  if (digits.length >= 11 && digits.length <= 15) {
    return digits;
  }
  return null;
}

/**
 * Sends a pre-approved template message via WhatsApp Business Cloud API.
 * Never fabricates delivery: returns status "skipped" when credentials are unset.
 */
export async function sendWhatsAppTemplate(
  req: WhatsAppTemplateRequest,
): Promise<WhatsAppSendResult> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    return {
      status: "skipped",
      errorMessage:
        "WhatsApp credentials (WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID) are not configured.",
    };
  }

  const normalizedTo = normalizeWhatsAppPhone(req.to);
  if (!normalizedTo) {
    return {
      status: "failed",
      errorMessage: "Invalid recipient WhatsApp phone number.",
    };
  }

  const endpoint = `https://graph.facebook.com/v21.0/${encodeURIComponent(phoneNumberId)}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    to: normalizedTo,
    type: "template",
    template: {
      name: req.templateName,
      language: { code: req.languageCode ?? "en" },
      components: [
        {
          type: "body",
          parameters: req.bodyParameters.map((text) => ({
            type: "text",
            text: text.slice(0, 500),
          })),
        },
      ],
    },
  };

  let lastError = "Unknown WhatsApp API error";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await res.json().catch(() => ({}))) as {
        messages?: Array<{ id?: string }>;
        error?: { message?: string };
      };

      if (res.ok && data.messages?.[0]?.id) {
        return {
          status: "sent",
          providerMessageId: data.messages[0].id,
        };
      }

      lastError = data.error?.message ?? `HTTP ${res.status}`;
      if (res.status < 500) break; // do not retry 4xx client/template errors
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Network error";
    }
  }

  return {
    status: "failed",
    errorMessage: lastError,
  };
}
