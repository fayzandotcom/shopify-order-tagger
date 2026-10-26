import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import db from "../db.server";

interface MatchedRule {
  id: number;
  condition: string;
  tag: string;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const taggedOrders = await db.taggedOrder.findMany({
    where: { shop: session.shop },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return {
    orders: taggedOrders.map((order) => ({
      id: order.id,
      name: order.orderName,
      // "gid://shopify/Order/123" → "123", for the admin order link.
      adminId: order.orderId.split("/").pop(),
      tags: JSON.parse(order.tags) as string[],
      matchedRules: JSON.parse(order.matchedRules) as MatchedRule[],
      // Formatted on the server in UTC so the server and browser render the same text.
      taggedAt: `${order.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC`,
    })),
  };
};

export default function Index() {
  const { orders } = useLoaderData<typeof loader>();

  return (
    <s-page heading="Taggly">
      <s-section heading="Recently tagged orders">
        {orders.length === 0 ? (
          <s-paragraph>
            No orders have been tagged yet. Add a rule on the{" "}
            <s-link href="/app/rules">Rules</s-link> page, and orders that
            match it will appear here.
          </s-paragraph>
        ) : (
          <s-table>
            <s-table-header-row>
              <s-table-header listSlot="primary">Order</s-table-header>
              <s-table-header>Tags added</s-table-header>
              <s-table-header>Matched rules</s-table-header>
              <s-table-header>Tagged</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {orders.map((order) => (
                <s-table-row key={order.id}>
                  <s-table-cell>
                    <s-link href={`shopify://admin/orders/${order.adminId}`}>
                      {order.name}
                    </s-link>
                  </s-table-cell>
                  <s-table-cell>
                    <s-stack direction="inline" gap="small-200">
                      {order.tags.map((tag) => (
                        <s-badge key={tag}>{tag}</s-badge>
                      ))}
                    </s-stack>
                  </s-table-cell>
                  <s-table-cell>
                    {order.matchedRules
                      .map((rule) => `${rule.condition} → ${rule.tag}`)
                      .join(", ")}
                  </s-table-cell>
                  <s-table-cell>{order.taggedAt}</s-table-cell>
                </s-table-row>
              ))}
            </s-table-body>
          </s-table>
        )}
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
