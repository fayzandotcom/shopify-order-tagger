import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PartnerApiError,
  billingConfig,
  checkBillingSetup,
  createPlanChecker,
  describeSubscription,
  isConfigurationError,
  planSelectionUrl,
  toPartnersAppGid,
} from "./subscription.server";

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

describe("isConfigurationError", () => {
  it("treats a rejected token or missing permission as a configuration error", () => {
    expect(isConfigurationError(new PartnerApiError("x", 401, []))).toBe(true);
    expect(isConfigurationError(new PartnerApiError("x", 403, []))).toBe(true);
    // The Partner API can also answer 200 with a 401 code in the errors list.
    expect(isConfigurationError(new PartnerApiError("x", 200, ["401"]))).toBe(true);
  });

  it("doesn't treat throttling, outages or other errors as configuration errors", () => {
    expect(isConfigurationError(new PartnerApiError("x", 429, ["THROTTLED"]))).toBe(false);
    expect(isConfigurationError(new PartnerApiError("x", 503, []))).toBe(false);
    expect(isConfigurationError(new Error("network down"))).toBe(false);
  });
});

describe("checkBillingSetup", () => {
  const config = {
    token: "token",
    orgId: "130721303",
    appId: "gid://shopify/App/436734230529",
    appHandle: "order-tagger-69",
  };

  function mockPartnerApi(status: number, body: unknown) {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(body), { status })),
    );
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("says plan checks are off when the settings aren't set", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await checkBillingSetup(null);
    expect(log).toHaveBeenCalledWith(expect.stringContaining("Plan checks are off"));
  });

  it("logs OK when the token works and the app is found", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    mockPartnerApi(200, { data: { app: { id: config.appId, name: "Taggly" } } });
    await checkBillingSetup(config);
    expect(log).toHaveBeenCalledWith(expect.stringContaining("Partner API access OK"));
  });

  it("logs a loud configuration error for an invalid token", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    mockPartnerApi(200, {
      errors: [{ message: "Invalid access token", extensions: { code: "401" } }],
    });
    await checkBillingSetup(config);
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining("EVERY SHOP CURRENTLY HAS FREE ACCESS"),
      expect.any(PartnerApiError),
    );
  });

  it("logs a loud configuration error when the app isn't in the organization", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    mockPartnerApi(200, { data: { app: null } });
    await checkBillingSetup(config);
    expect(error).toHaveBeenCalledWith(expect.stringContaining("wasn't found in Partner organization"));
  });
});

describe("toPartnersAppGid", () => {
  it("converts the app ID to the format the Partner API's app query expects", () => {
    expect(toPartnersAppGid("gid://shopify/App/436734230529")).toBe(
      "gid://partners/App/436734230529",
    );
    expect(toPartnersAppGid("gid://partners/App/436734230529")).toBe(
      "gid://partners/App/436734230529",
    );
  });
});

describe("createPlanChecker forget", () => {
  it("drops a cached active plan, so the next check asks Shopify again", async () => {
    const results = [true, false];
    const fetchActive = vi.fn(async () => results.shift() ?? false);
    const check = createPlanChecker(fetchActive, () => 0);

    expect(await check("shop", { allowCachedInactive: false })).toBe(true);
    check.forget("shop");
    expect(await check("shop", { allowCachedInactive: false })).toBe(false);
    expect(fetchActive).toHaveBeenCalledTimes(2);
  });
});

describe("describeSubscription", () => {
  it("summarizes an active subscription for the logs", () => {
    expect(
      describeSubscription({
        billingPeriod: "EVERY_30_DAYS",
        cancelAtEndOfCycle: true,
        trialEndsAt: "2026-11-25T03:51:00Z",
        currentBillingCycle: null,
        items: [{ handle: "standard" }],
      }),
    ).toBe(
      "active (plans: standard, EVERY_30_DAYS, cancelAtEndOfCycle: true, " +
        "trialEndsAt: 2026-11-25T03:51:00Z, cycleEnds: none)",
    );
  });

  it("says when there is no subscription", () => {
    expect(describeSubscription(null)).toBe("no active subscription");
  });
});
