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

  return async function hasActivePlan(
    shopId: string,
    { allowCachedInactive }: { allowCachedInactive: boolean },
  ): Promise<boolean> {
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
      console.error("Couldn't check the shop's plan; allowing access", error);
      return true;
    }
  };
}

async function fetchActiveSubscription(config: BillingConfig, shopId: string): Promise<boolean> {
  const response = await fetch(
    `https://partners.shopify.com/${config.orgId}/api/${PARTNER_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": config.token,
      },
      body: JSON.stringify({
        query: `query activeSubscription($appId: ID!, $shopId: ID!) {
          activeSubscription(appId: $appId, shopId: $shopId) {
            billingPeriod
          }
        }`,
        variables: { appId: config.appId, shopId },
      }),
    },
  );
  const { data, errors } = await response.json();
  if (!response.ok || errors) {
    throw new Error(`Partner API request failed: ${JSON.stringify(errors ?? response.status)}`);
  }
  // null means the shop has no active subscription (or trial) for the app.
  return data.activeSubscription !== null;
}

const config = billingConfig();
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

// The plan selection page for a shop, or null when billing is off.
export function planSelectionUrlFor(shop: string): string | null {
  return config ? planSelectionUrl(shop, config.appHandle) : null;
}
