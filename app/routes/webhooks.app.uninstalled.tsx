import type { ActionFunctionArgs } from "react-router";
import db from "../db.server";
import { forgetShop } from "../subscription.server";
import { verifyWebhook } from "../webhooks.server";

// verifyWebhook, not authenticate.webhook: the shop's access token can't be
// refreshed after an uninstall, so authenticate.webhook would answer 500 (#72).
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await verifyWebhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Uninstalling ends the plan, so drop the cached status: a reinstall must
  // check with Shopify again.
  forgetShop(shop);

  // Webhook requests can trigger multiple times and after an app has already been uninstalled.
  // deleteMany does nothing if the sessions were already deleted.
  await db.session.deleteMany({ where: { shop } });

  return new Response();
};
