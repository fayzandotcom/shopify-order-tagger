import type { ActionFunctionArgs } from "react-router";
import { redactCustomerOrders } from "../compliance.server";
import { verifyWebhook } from "../webhooks.server";

// Mandatory compliance webhook. verifyWebhook rejects requests with an invalid
// HMAC with 401, and works after an uninstall (#72). Don't log the customer
// object (email, phone).
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await verifyWebhook(request);
  const orderIds = (payload as { orders_to_redact?: number[] }).orders_to_redact;

  const deleted = await redactCustomerOrders(shop, orderIds);
  console.log(`Received ${topic} webhook for ${shop}`, {
    ordersToRedact: orderIds?.length ?? 0,
    deletedHistoryRows: deleted,
  });

  return new Response();
};
