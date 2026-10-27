import { createHmac, timingSafeEqual } from "node:crypto";

// Verifies webhooks that don't need the Admin API (app/uninstalled and the
// compliance webhooks) without loading the shop's session. authenticate.webhook
// refreshes an expired offline token first, which fails once the app is
// uninstalled, and then answers 500 (#72).

// Shopify signs the raw body with the app's API secret (HMAC-SHA256, base64).
export function isValidWebhookHmac(
  rawBody: string,
  hmacHeader: string | null,
  secret: string,
): boolean {
  if (!hmacHeader || !secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest();
  const received = Buffer.from(hmacHeader, "base64");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export interface VerifiedWebhook {
  shop: string;
  topic: string;
  payload: unknown;
}

// Same responses as authenticate.webhook: 405 for non-POST, 401 for an
// invalid signature, 400 for a malformed request.
export async function verifyWebhook(
  request: Request,
  secret: string = process.env.SHOPIFY_API_SECRET ?? "",
): Promise<VerifiedWebhook> {
  if (request.method !== "POST") {
    throw new Response(undefined, { status: 405, statusText: "Method not allowed" });
  }

  const rawBody = await request.text();
  if (!isValidWebhookHmac(rawBody, request.headers.get("X-Shopify-Hmac-Sha256"), secret)) {
    throw new Response(undefined, { status: 401, statusText: "Unauthorized" });
  }

  const shop = request.headers.get("X-Shopify-Shop-Domain");
  const topic = request.headers.get("X-Shopify-Topic");
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    payload = undefined;
  }
  if (!shop || !topic || payload === undefined) {
    throw new Response(undefined, { status: 400, statusText: "Bad Request" });
  }

  return { shop, topic, payload };
}
