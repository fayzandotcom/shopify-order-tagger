import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { isValidWebhookHmac, verifyWebhook } from "./webhooks.server";

const SECRET = "test-secret";
const BODY = JSON.stringify({ shop_id: 1, shop_domain: "cool-shop.myshopify.com" });

function sign(body: string, secret = SECRET) {
  return createHmac("sha256", secret).update(body, "utf8").digest("base64");
}

function webhookRequest({
  body = BODY,
  hmac = sign(BODY),
  method = "POST",
  shop = "cool-shop.myshopify.com",
  topic = "shop/redact",
}: { body?: string; hmac?: string | null; method?: string; shop?: string | null; topic?: string | null } = {}) {
  const headers = new Headers();
  if (hmac !== null) headers.set("X-Shopify-Hmac-Sha256", hmac);
  if (shop !== null) headers.set("X-Shopify-Shop-Domain", shop);
  if (topic !== null) headers.set("X-Shopify-Topic", topic);
  return new Request("https://example.com/webhooks/shop/redact", {
    method,
    headers,
    body: method === "POST" ? body : undefined,
  });
}

async function statusOf(promise: Promise<unknown>) {
  try {
    await promise;
    return "resolved";
  } catch (error) {
    return error instanceof Response ? error.status : error;
  }
}

describe("isValidWebhookHmac", () => {
  it("accepts a body signed with the secret", () => {
    expect(isValidWebhookHmac(BODY, sign(BODY), SECRET)).toBe(true);
  });

  it("accepts non-ASCII bodies", () => {
    const body = JSON.stringify({ name: "Café #1001 ✓" });
    expect(isValidWebhookHmac(body, sign(body), SECRET)).toBe(true);
  });

  it("rejects a changed body, a different secret, or a missing or malformed signature", () => {
    expect(isValidWebhookHmac(`${BODY} `, sign(BODY), SECRET)).toBe(false);
    expect(isValidWebhookHmac(BODY, sign(BODY, "other-secret"), SECRET)).toBe(false);
    expect(isValidWebhookHmac(BODY, null, SECRET)).toBe(false);
    expect(isValidWebhookHmac(BODY, "not-base64!", SECRET)).toBe(false);
  });

  it("rejects everything when the secret isn't set", () => {
    expect(isValidWebhookHmac(BODY, sign(BODY, ""), "")).toBe(false);
  });
});

describe("verifyWebhook", () => {
  it("returns the shop, topic and payload of a signed webhook", async () => {
    await expect(verifyWebhook(webhookRequest(), SECRET)).resolves.toEqual({
      shop: "cool-shop.myshopify.com",
      topic: "shop/redact",
      payload: JSON.parse(BODY),
    });
  });

  it("answers 401 for an invalid signature", async () => {
    expect(await statusOf(verifyWebhook(webhookRequest({ hmac: sign(BODY, "x") }), SECRET))).toBe(401);
    expect(await statusOf(verifyWebhook(webhookRequest({ hmac: null }), SECRET))).toBe(401);
  });

  it("answers 405 for requests other than POST", async () => {
    expect(await statusOf(verifyWebhook(webhookRequest({ method: "GET" }), SECRET))).toBe(405);
  });

  it("answers 400 for a signed request without shop or topic headers, or with a body that isn't JSON", async () => {
    expect(await statusOf(verifyWebhook(webhookRequest({ shop: null }), SECRET))).toBe(400);
    expect(await statusOf(verifyWebhook(webhookRequest({ topic: null }), SECRET))).toBe(400);
    expect(
      await statusOf(verifyWebhook(webhookRequest({ body: "not json", hmac: sign("not json") }), SECRET)),
    ).toBe(400);
  });
});
