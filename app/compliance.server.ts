import db from "./db.server";

// Handlers for Shopify's mandatory compliance webhooks. The app stores no
// customer personal data, but the activity history (TaggedOrder) holds order
// IDs and names, which belong to a customer's orders.

// Compliance payloads list orders as numeric IDs; TaggedOrder stores GraphQL IDs.
export function toOrderGids(orderIds: number[] | undefined): string[] {
  return (orderIds ?? []).map((id) => `gid://shopify/Order/${id}`);
}

// customers/data_request: returns the stored history rows for the customer's orders.
export function findCustomerOrders(shop: string, orderIds: number[] | undefined) {
  return db.taggedOrder.findMany({
    where: { shop, orderId: { in: toOrderGids(orderIds) } },
    select: { orderId: true, orderName: true, tags: true, createdAt: true },
  });
}

// customers/redact: deletes the stored history rows for the customer's orders.
export async function redactCustomerOrders(shop: string, orderIds: number[] | undefined) {
  const { count } = await db.taggedOrder.deleteMany({
    where: { shop, orderId: { in: toOrderGids(orderIds) } },
  });
  return count;
}

// shop/redact (sent 48 hours after uninstall): deletes everything stored for the shop.
export async function deleteShopData(shop: string) {
  const [rules, taggedOrders, sessions] = await db.$transaction([
    db.rule.deleteMany({ where: { shop } }),
    db.taggedOrder.deleteMany({ where: { shop } }),
    db.session.deleteMany({ where: { shop } }),
  ]);
  return { rules: rules.count, taggedOrders: taggedOrders.count, sessions: sessions.count };
}
