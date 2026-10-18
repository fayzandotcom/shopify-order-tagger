import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";
import db from "./db.server";
import { evaluateRules, type OrderFacts } from "./rules";

export interface NewOrder {
  id: string;
  name: string;
  total: number;
  productIds: string[];
  discountCodes: string[];
}

// Runs the shop's enabled rules against a new order and adds the matching
// tags to it. Returns the tags added and the rules that matched.
export async function tagOrder(
  admin: AdminApiContext,
  shop: string,
  order: NewOrder,
) {
  const rules = await db.rule.findMany({ where: { shop, enabled: true } });

  // Product tags aren't in the webhook payload, so look them up, but only
  // when a rule needs them.
  const needsProductTags = rules.some((rule) => rule.field === "productTag");
  const facts: OrderFacts = {
    total: order.total,
    discountCodes: order.discountCodes,
    productTags: needsProductTags
      ? await fetchProductTags(admin, order.productIds)
      : [],
  };

  const result = evaluateRules(facts, rules);

  if (result.tags.length === 0) {
    console.log(`No rules matched ${order.name} (${rules.length} enabled rules)`);
    return result;
  }

  const response = await admin.graphql(
    `#graphql
      mutation addOrderTags($id: ID!, $tags: [String!]!) {
        tagsAdd(id: $id, tags: $tags) {
          userErrors {
            field
            message
          }
        }
      }`,
    { variables: { id: order.id, tags: result.tags } },
  );
  const { data } = await response.json();
  const userErrors = data?.tagsAdd?.userErrors ?? [];

  if (userErrors.length > 0) {
    console.error(`Couldn't tag ${order.name}`, { tags: result.tags, userErrors });
  } else {
    console.log(`Tagged ${order.name}`, {
      tags: result.tags,
      ruleIds: result.matchedRules.map((rule) => rule.id),
    });
  }

  return result;
}

async function fetchProductTags(
  admin: AdminApiContext,
  productIds: string[],
): Promise<string[]> {
  if (productIds.length === 0) return [];

  const response = await admin.graphql(
    `#graphql
      query productTags($ids: [ID!]!) {
        nodes(ids: $ids) {
          ... on Product {
            tags
          }
        }
      }`,
    { variables: { ids: productIds } },
  );
  const { data } = await response.json();

  // A deleted product comes back as null.
  return (data?.nodes ?? []).flatMap((node: { tags?: string[] } | null) =>
    node?.tags ?? [],
  );
}
