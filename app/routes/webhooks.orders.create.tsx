import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

// The parts of the orders/create payload this app uses. The payload also
// carries customer details; don't read or log them (see AGENTS.md).
interface OrderCreatePayload {
  admin_graphql_api_id: string;
  name: string;
  currency: string;
  total_price: string;
  line_items: {
    title: string;
    quantity: number;
    price: string;
    product_id: number | null;
  }[];
  discount_codes: { code: string }[];
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);
  const order = payload as OrderCreatePayload;

  console.log(`Received ${topic} webhook for ${shop}`, {
    orderId: order.admin_graphql_api_id,
    name: order.name,
    total: `${order.total_price} ${order.currency}`,
    lineItems: order.line_items.map((item) => ({
      title: item.title,
      quantity: item.quantity,
      price: item.price,
      productId: item.product_id,
    })),
    discountCodes: order.discount_codes.map((discount) => discount.code),
  });

  return new Response();
};
