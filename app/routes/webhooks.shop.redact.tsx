import type { ActionFunctionArgs } from "react-router";
import { deleteShopData } from "../compliance.server";
import { verifyWebhook } from "../webhooks.server";

// Mandatory compliance webhook, sent 48 hours after a shop uninstalls the app.
// verifyWebhook rejects requests with an invalid HMAC with 401. It's used
// instead of authenticate.webhook, which answers 500 once the uninstalled
// shop's access token has expired (#72).
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await verifyWebhook(request);

  const deleted = await deleteShopData(shop);
  console.log(`Received ${topic} webhook for ${shop}`, { deleted });

  return new Response();
};
