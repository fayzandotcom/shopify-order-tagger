import type { ActionFunctionArgs } from "react-router";
import { findCustomerOrders } from "../compliance.server";
import { verifyWebhook } from "../webhooks.server";

// Mandatory compliance webhook. verifyWebhook rejects requests with an invalid
// HMAC with 401, and works after an uninstall (#72). Don't log the customer
// object (email, phone).
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await verifyWebhook(request);
  const orderIds = (payload as { orders_requested?: number[] }).orders_requested;

  const orders = await findCustomerOrders(shop, orderIds);
  console.log(`Received ${topic} webhook for ${shop}`, {
    ordersRequested: orderIds?.length ?? 0,
    storedOrders: orders.map((order) => order.orderName),
  });

  return new Response();
};
