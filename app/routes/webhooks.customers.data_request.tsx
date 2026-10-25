import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { findCustomerOrders } from "../compliance.server";

// Mandatory compliance webhook. authenticate.webhook rejects requests with an
// invalid HMAC with 401. Don't log the customer object (email, phone).
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);
  const orderIds = (payload as { orders_requested?: number[] }).orders_requested;

  const orders = await findCustomerOrders(shop, orderIds);
  console.log(`Received ${topic} webhook for ${shop}`, {
    ordersRequested: orderIds?.length ?? 0,
    storedOrders: orders.map((order) => order.orderName),
  });

  return new Response();
};
