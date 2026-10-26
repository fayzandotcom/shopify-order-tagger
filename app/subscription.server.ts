import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";

// Shopify App Pricing (#28, #47): one plan, Standard. The Partner API reports
// whether a shop has an active subscription (including the free trial).
//
// The check is on only when all four settings exist. The dev app is a custom
// app that App Pricing doesn't cover, so local development leaves them unset.
const PARTNER_API_VERSION = "2026-10";

export interface BillingConfig {
  token: string;
  orgId: string;
  appId: string;
  appHandle: string;
}

export function billingConfig(env: NodeJS.ProcessEnv = process.env): BillingConfig | null {
  const token = env.SHOPIFY_PARTNER_API_ACCESS_TOKEN;
  const orgId = env.SHOPIFY_PARTNER_ORG_ID;
  const appId = env.SHOPIFY_APP_GID;
  const appHandle = env.SHOPIFY_APP_HANDLE;
  return token && orgId && appId && appHandle ? { token, orgId, appId, appHandle } : null;
}

// Shopify-hosted plan selection page, e.g. for cool-shop.myshopify.com:
// https://admin.shopify.com/store/cool-shop/charges/<app-handle>/pricing_plans
export function planSelectionUrl(shop: string, appHandle: string): string {
  const storeHandle = shop.replace(/\.myshopify\.com$/, "");
  return `https://admin.shopify.com/store/${storeHandle}/charges/${appHandle}/pricing_plans`;
}

type FetchActive = (shopId: string) => Promise<boolean>;

// Remembers an active plan for 10 minutes. A missing plan is remembered for
// 1 minute, and only when the caller allows it: the app pages always re-check,
// so a merchant who just approved the plan isn't sent back to the plan page.
// If the Partner API fails, the shop is treated as active so a paying merchant
// is never locked out by an API error.
export function createPlanChecker(fetchActive: FetchActive, now: () => number = Date.now) {
  const ACTIVE_TTL = 10 * 60 * 1000;
  const INACTIVE_TTL = 60 * 1000;
  const cache = new Map<string, { active: boolean; at: number }>();

  const hasActivePlan = async (
    shopId: string,
    { allowCachedInactive }: { allowCachedInactive: boolean },
  ): Promise<boolean> => {
    const cached = cache.get(shopId);
    if (cached) {
      const age = now() - cached.at;
      if (cached.active && age < ACTIVE_TTL) return true;
      if (!cached.active && allowCachedInactive && age < INACTIVE_TTL) return false;
    }

    try {
      const active = await fetchActive(shopId);
      cache.set(shopId, { active, at: now() });
      return active;
    } catch (error) {
      if (isConfigurationError(error)) {
        logConfigurationError(error);
      } else {
        console.error("[billing] Couldn't check the shop's plan; allowing access", error);
      }
      return true;
    }
  };

  // Drops the cached status, e.g. on uninstall, so a reinstall asks Shopify again.
  const forget = (shopId: string) => {
    cache.delete(shopId);
  };

  return Object.assign(hasActivePlan, { forget });
}

export class PartnerApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly codes: string[],
  ) {
    super(message);
    this.name = "PartnerApiError";
  }
}

// A rejected token (401) or missing permission (403) won't fix itself, unlike
// throttling or an outage: every shop gets free access until the Render
// settings are corrected.
export function isConfigurationError(error: unknown): boolean {
  if (!(error instanceof PartnerApiError)) return false;
  return (
    error.status === 401 ||
    error.status === 403 ||
    error.codes.some((code) => ["401", "403", "ACCESS_DENIED", "UNAUTHORIZED"].includes(code))
  );
}

function logConfigurationError(error: unknown) {
  console.error(
    "[billing] CONFIGURATION ERROR: the Partner API rejected the request, so plan checks " +
      "can't run and EVERY SHOP CURRENTLY HAS FREE ACCESS. Check SHOPIFY_PARTNER_API_ACCESS_TOKEN " +
      "(a Partner API client with Manage apps), SHOPIFY_PARTNER_ORG_ID and SHOPIFY_APP_GID on Render.",
    error,
  );
}

async function partnerGraphql(
  config: BillingConfig,
  query: string,
  variables: Record<string, unknown>,
) {
  const response = await fetch(
    `https://partners.shopify.com/${config.orgId}/api/${PARTNER_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": config.token,
      },
      body: JSON.stringify({ query, variables }),
    },
  );
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.errors) {
    const codes: string[] = (body.errors ?? [])
      .map((e: { extensions?: { code?: string } }) => e.extensions?.code)
      .filter(Boolean);
    throw new PartnerApiError(
      `Partner API request failed: ${JSON.stringify(body.errors ?? response.status)}`,
      response.status,
      codes,
    );
  }
  return body.data;
}

async function fetchActiveSubscription(config: BillingConfig, shopId: string): Promise<boolean> {
  const data = await partnerGraphql(
    config,
    `query activeSubscription($appId: ID!, $shopId: ID!) {
      activeSubscription(appId: $appId, shopId: $shopId) {
        billingPeriod
      }
    }`,
    { appId: config.appId, shopId },
  );
  // null means the shop has no active subscription (or trial) for the app.
  return data.activeSubscription !== null;
}

// The Partner API's app(id:) query wants gid://partners/App/<id>, while
// activeSubscription takes gid://shopify/App/<id> (the SHOPIFY_APP_GID format).
export function toPartnersAppGid(appGid: string): string {
  return appGid.replace(/^gid:\/\/shopify\/App\//, "gid://partners/App/");
}

// Runs once when the server starts, so a bad token or app ID shows up in the
// deploy logs right away instead of when a merchant opens the app.
export async function checkBillingSetup(config: BillingConfig | null): Promise<void> {
  if (!config) {
    console.log("[billing] Plan checks are off (Partner API settings aren't set)");
    return;
  }
  try {
    const data = await partnerGraphql(
      config,
      `query billingSelfCheck($appId: ID!) {
        app(id: $appId) {
          id
          name
        }
      }`,
      { appId: toPartnersAppGid(config.appId) },
    );
    if (!data.app) {
      console.error(
        `[billing] CONFIGURATION ERROR: app ${config.appId} wasn't found in Partner organization ` +
          `${config.orgId}, so EVERY SHOP CURRENTLY HAS FREE ACCESS. Check SHOPIFY_APP_GID and SHOPIFY_PARTNER_ORG_ID on Render.`,
      );
      return;
    }
    console.log(`[billing] Partner API access OK (${data.app.name}); plan checks are on`);
  } catch (error) {
    if (isConfigurationError(error)) {
      logConfigurationError(error);
    } else {
      console.error("[billing] Couldn't run the startup check against the Partner API", error);
    }
  }
}

const config = billingConfig();
if (process.env.NODE_ENV !== "test") void checkBillingSetup(config);
const checkPlan = config
  ? createPlanChecker((shopId) => fetchActiveSubscription(config, shopId))
  : null;
const shopIds = new Map<string, string>();

async function shopGid(admin: AdminApiContext, shop: string): Promise<string> {
  const known = shopIds.get(shop);
  if (known) return known;

  const response = await admin.graphql(`#graphql
    query shopId {
      shop {
        id
      }
    }`);
  const { data } = await response.json();
  const id: string = data.shop.id;
  shopIds.set(shop, id);
  return id;
}

// Returns true when billing is off (no settings) or the shop has an active
// plan. Pass allowCachedInactive: true only where a slightly stale "no plan"
// answer is acceptable, such as the order webhook.
export async function shopHasActivePlan(
  admin: AdminApiContext,
  shop: string,
  { allowCachedInactive }: { allowCachedInactive: boolean },
): Promise<boolean> {
  if (!checkPlan) return true;
  return checkPlan(await shopGid(admin, shop), { allowCachedInactive });
}

// Called on app/uninstalled: forget the shop's cached plan, so opening the app
// after a reinstall checks with Shopify again instead of reusing "active".
export function forgetShop(shop: string): void {
  const shopId = shopIds.get(shop);
  if (shopId) checkPlan?.forget(shopId);
  shopIds.delete(shop);
}

// The plan selection page for a shop, or null when billing is off.
export function planSelectionUrlFor(shop: string): string | null {
  return config ? planSelectionUrl(shop, config.appHandle) : null;
}
