import { useEffect, useRef } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { data, useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { RULE_CONDITIONS, describeCondition, validateRule } from "../rules";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const rules = await db.rule.findMany({
    where: { shop: session.shop },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      field: true,
      operator: true,
      value: true,
      tag: true,
      enabled: true,
    },
  });

  return { rules };
};

interface ActionResult {
  errors: string[];
  created?: boolean;
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const form = await request.formData();
  const id = Number(form.get("id"));

  switch (form.get("intent")) {
    case "create": {
      // The condition select sends "field:operator", e.g. "orderTotal:gt".
      const [field = "", operator = ""] = String(form.get("condition") ?? "").split(":");
      const rule = {
        field,
        operator,
        value: String(form.get("value") ?? "").trim(),
        tag: String(form.get("tag") ?? "").trim(),
      };

      const errors = validateRule(rule);
      if (errors.length > 0) {
        return data<ActionResult>({ errors }, { status: 400 });
      }

      await db.rule.create({ data: { shop, ...rule } });
      return data<ActionResult>({ errors: [], created: true });
    }

    // updateMany and deleteMany filter by shop too, so a shop can only
    // change its own rules.
    case "toggle":
      await db.rule.updateMany({
        where: { id, shop },
        data: { enabled: form.get("enabled") === "true" },
      });
      return data<ActionResult>({ errors: [] });

    case "delete":
      await db.rule.deleteMany({ where: { id, shop } });
      return data<ActionResult>({ errors: [] });

    default:
      return data<ActionResult>({ errors: ["Unknown action."] }, { status: 400 });
  }
};

export default function Rules() {
  const { rules } = useLoaderData<typeof loader>();

  return (
    <s-page heading="Rules">
      <AddRuleSection />

      <s-section heading="Your rules">
        {rules.length === 0 ? (
          <s-paragraph>
            No rules yet. Add one above, and new orders that match it will be
            tagged automatically.
          </s-paragraph>
        ) : (
          <s-table>
            <s-table-header-row>
              <s-table-header listSlot="primary">Condition</s-table-header>
              <s-table-header>Tag</s-table-header>
              <s-table-header>Status</s-table-header>
              <s-table-header>Actions</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {rules.map((rule) => (
                <RuleRow key={rule.id} rule={rule} />
              ))}
            </s-table-body>
          </s-table>
        )}
      </s-section>
    </s-page>
  );
}

function AddRuleSection() {
  const fetcher = useFetcher<ActionResult>();
  const formRef = useRef<HTMLFormElement>(null);
  const shopify = useAppBridge();
  const isSubmitting = fetcher.state !== "idle";
  const errors = fetcher.data?.errors ?? [];

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.created) {
      formRef.current?.reset();
      shopify.toast.show("Rule added");
    }
  }, [fetcher.state, fetcher.data, shopify]);

  return (
    <s-section heading="Add a rule">
      <fetcher.Form method="post" ref={formRef}>
        <input type="hidden" name="intent" value="create" />
        <s-stack direction="block" gap="base">
          {errors.length > 0 && (
            <s-banner heading="Couldn't add the rule" tone="critical">
              {errors.join(" ")}
            </s-banner>
          )}
          <s-grid gridTemplateColumns="2fr 1fr 1fr auto" gap="base" alignItems="end">
            <s-select label="Condition" name="condition">
              {RULE_CONDITIONS.map((condition) => (
                <s-option
                  key={`${condition.field}:${condition.operator}`}
                  value={`${condition.field}:${condition.operator}`}
                >
                  {condition.label}
                </s-option>
              ))}
            </s-select>
            <s-text-field
              label="Value"
              name="value"
              placeholder="100, Winter or TEST10"
              required
            ></s-text-field>
            <s-text-field
              label="Tag to add"
              name="tag"
              placeholder="high-value"
              required
            ></s-text-field>
            <s-button
              type="submit"
              variant="primary"
              {...(isSubmitting ? { loading: true } : {})}
            >
              Add rule
            </s-button>
          </s-grid>
        </s-stack>
      </fetcher.Form>
    </s-section>
  );
}

interface RuleRowProps {
  rule: {
    id: number;
    field: string;
    operator: string;
    value: string;
    tag: string;
    enabled: boolean;
  };
}

function RuleRow({ rule }: RuleRowProps) {
  const toggleFetcher = useFetcher<ActionResult>();
  const deleteFetcher = useFetcher<ActionResult>();

  return (
    <s-table-row>
      <s-table-cell>{describeCondition(rule)}</s-table-cell>
      <s-table-cell>{rule.tag}</s-table-cell>
      <s-table-cell>
        {rule.enabled ? (
          <s-badge tone="success">Enabled</s-badge>
        ) : (
          <s-badge tone="neutral">Disabled</s-badge>
        )}
      </s-table-cell>
      <s-table-cell>
        <s-stack direction="inline" gap="small-200">
          <toggleFetcher.Form method="post">
            <input type="hidden" name="intent" value="toggle" />
            <input type="hidden" name="id" value={rule.id} />
            <input type="hidden" name="enabled" value={String(!rule.enabled)} />
            <s-button
              type="submit"
              variant="secondary"
              {...(toggleFetcher.state !== "idle" ? { loading: true } : {})}
            >
              {rule.enabled ? "Disable" : "Enable"}
            </s-button>
          </toggleFetcher.Form>
          <deleteFetcher.Form method="post">
            <input type="hidden" name="intent" value="delete" />
            <input type="hidden" name="id" value={rule.id} />
            <s-button
              type="submit"
              variant="secondary"
              tone="critical"
              {...(deleteFetcher.state !== "idle" ? { loading: true } : {})}
            >
              Delete
            </s-button>
          </deleteFetcher.Form>
        </s-stack>
      </s-table-cell>
    </s-table-row>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
