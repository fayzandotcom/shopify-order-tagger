import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { deleteShopData } from "../compliance.server";

// Mandatory compliance webhook, sent 48 hours after a shop uninstalls the app.
// authenticate.webhook rejects requests with an invalid HMAC with 401.
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);

  const deleted = await deleteShopData(shop);
  console.log(`Received ${topic} webhook for ${shop}`, { deleted });

  return new Response();
};
