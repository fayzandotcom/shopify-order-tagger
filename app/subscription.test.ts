import { describe, expect, it, vi } from "vitest";
import { billingConfig, createPlanChecker, planSelectionUrl } from "./subscription.server";

describe("billingConfig", () => {
  const full = {
    SHOPIFY_PARTNER_API_ACCESS_TOKEN: "token",
    SHOPIFY_PARTNER_ORG_ID: "130721303",
    SHOPIFY_APP_GID: "gid://shopify/App/436734230529",
    SHOPIFY_APP_HANDLE: "order-tagger-69",
  };

  it("is on when all four settings exist", () => {
    expect(billingConfig(full)).toEqual({
      token: "token",
      orgId: "130721303",
      appId: "gid://shopify/App/436734230529",
      appHandle: "order-tagger-69",
    });
  });

  it("is off when any setting is missing (dev app, local development)", () => {
    expect(billingConfig({})).toBeNull();
    expect(billingConfig({ ...full, SHOPIFY_PARTNER_API_ACCESS_TOKEN: "" })).toBeNull();
    expect(billingConfig({ ...full, SHOPIFY_APP_HANDLE: undefined })).toBeNull();
  });
});

describe("planSelectionUrl", () => {
  it("builds Shopify's plan selection page from the shop and app handle", () => {
    expect(planSelectionUrl("cool-shop.myshopify.com", "order-tagger-69")).toBe(
      "https://admin.shopify.com/store/cool-shop/charges/order-tagger-69/pricing_plans",
    );
  });
});

describe("createPlanChecker", () => {
  function setup(results: Array<boolean | Error>) {
    let time = 0;
    const fetchActive = vi.fn(async () => {
      const next = results.shift();
      if (next instanceof Error) throw next;
      return next ?? false;
    });
    const check = createPlanChecker(fetchActive, () => time);
    return { check, fetchActive, advance: (ms: number) => (time += ms) };
  }

  it("remembers an active plan for 10 minutes", async () => {
    const { check, fetchActive, advance } = setup([true, true]);
    expect(await check("shop", { allowCachedInactive: false })).toBe(true);
    advance(9 * 60 * 1000);
    expect(await check("shop", { allowCachedInactive: false })).toBe(true);
    expect(fetchActive).toHaveBeenCalledTimes(1);
    advance(2 * 60 * 1000);
    await check("shop", { allowCachedInactive: false });
    expect(fetchActive).toHaveBeenCalledTimes(2);
  });

  it("re-checks a missing plan on app pages, so a just-approved plan is seen", async () => {
    const { check, fetchActive } = setup([false, true]);
    expect(await check("shop", { allowCachedInactive: false })).toBe(false);
    expect(await check("shop", { allowCachedInactive: false })).toBe(true);
    expect(fetchActive).toHaveBeenCalledTimes(2);
  });

  it("lets the webhook reuse a missing plan for up to a minute", async () => {
    const { check, fetchActive, advance } = setup([false, false]);
    expect(await check("shop", { allowCachedInactive: true })).toBe(false);
    advance(30 * 1000);
    expect(await check("shop", { allowCachedInactive: true })).toBe(false);
    expect(fetchActive).toHaveBeenCalledTimes(1);
    advance(31 * 1000);
    await check("shop", { allowCachedInactive: true });
    expect(fetchActive).toHaveBeenCalledTimes(2);
  });

  it("allows access when the Partner API fails, and doesn't cache that", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { check, fetchActive } = setup([new Error("throttled"), false]);
    expect(await check("shop", { allowCachedInactive: true })).toBe(true);
    expect(await check("shop", { allowCachedInactive: true })).toBe(false);
    expect(fetchActive).toHaveBeenCalledTimes(2);
  });
});
