// The order fields a rule can test, and the operators each field allows.
// Rule.field and Rule.operator are stored as plain strings, so these lists
// are the source of truth for which values are valid.
export const RULE_OPERATORS = {
  // Order total compared as a number, e.g. total > 100.
  orderTotal: ["gt", "gte", "lt", "lte", "eq"],
  // Any product in the order has this tag. Case-insensitive.
  productTag: ["contains"],
  // A discount code used on the order equals this code. Case-insensitive.
  discountCode: ["eq"],
} as const;

// The Standard plan allows this many rules per shop, enabled or not (#28).
export const MAX_RULES_PER_SHOP = 100;

// Returns an error message when a shop that already has `ruleCount` rules
// can't add another one, or null when it can.
export function ruleLimitError(ruleCount: number): string | null {
  return ruleCount >= MAX_RULES_PER_SHOP
    ? `You've reached the limit of ${MAX_RULES_PER_SHOP} rules. Delete a rule to add a new one.`
    : null;
}

export type RuleField = keyof typeof RULE_OPERATORS;
export type RuleOperator = (typeof RULE_OPERATORS)[RuleField][number];

// Each field + operator pair as merchants see it. The rules form offers these
// as one "Condition" choice, so the operator always fits the field.
export const RULE_CONDITIONS: {
  field: RuleField;
  operator: RuleOperator;
  label: string;
  symbol: string;
}[] = [
  { field: "orderTotal", operator: "gt", label: "Order total is greater than", symbol: ">" },
  { field: "orderTotal", operator: "gte", label: "Order total is at least", symbol: "≥" },
  { field: "orderTotal", operator: "lt", label: "Order total is less than", symbol: "<" },
  { field: "orderTotal", operator: "lte", label: "Order total is at most", symbol: "≤" },
  { field: "orderTotal", operator: "eq", label: "Order total equals", symbol: "=" },
  { field: "productTag", operator: "contains", label: "Order has a product tagged", symbol: "has" },
  { field: "discountCode", operator: "eq", label: "Discount code used is", symbol: "=" },
];

const FIELD_NAMES: Record<RuleField, string> = {
  orderTotal: "Order total",
  productTag: "Product tag",
  discountCode: "Discount code",
};

// A short description of a rule's condition, e.g. "Order total > 100".
export function describeCondition(rule: Pick<RuleInput, "field" | "operator" | "value">): string {
  const condition = RULE_CONDITIONS.find(
    (c) => c.field === rule.field && c.operator === rule.operator,
  );
  if (!condition) return `${rule.field} ${rule.operator} ${rule.value}`;
  return `${FIELD_NAMES[condition.field]} ${condition.symbol} ${rule.value}`;
}

export interface RuleInput {
  field: string;
  operator: string;
  value: string;
  tag: string;
}

export function isRuleField(field: string): field is RuleField {
  return Object.hasOwn(RULE_OPERATORS, field);
}

// Returns a list of problems with the rule, or an empty list if it's valid.
export function validateRule(rule: RuleInput): string[] {
  const errors: string[] = [];

  if (!isRuleField(rule.field)) {
    errors.push(`Unknown field "${rule.field}".`);
  } else {
    const operators: readonly string[] = RULE_OPERATORS[rule.field];
    if (!operators.includes(rule.operator)) {
      errors.push(`Operator "${rule.operator}" can't be used with ${rule.field}.`);
    }
    if (rule.field === "orderTotal" && !Number.isFinite(Number(rule.value))) {
      errors.push("Order total must be a number.");
    }
  }

  if (rule.value.trim() === "") {
    errors.push("Value is required.");
  }
  if (rule.tag.trim() === "") {
    errors.push("Tag is required.");
  }

  return errors;
}

// The order data rules are evaluated against. The webhook handler builds this
// from the order payload plus the tags of the products in the order.
export interface OrderFacts {
  total: number;
  productTags: string[];
  discountCodes: string[];
}

export interface EvaluableRule extends RuleInput {
  enabled: boolean;
}

export interface Evaluation<R extends EvaluableRule> {
  // Tags to add to the order, without duplicates.
  tags: string[];
  // Rules that matched, so callers can record which rule added which tag.
  matchedRules: R[];
}

// Returns the enabled rules that match the order and the tags they add.
// Rules with an unknown field or operator never match.
export function evaluateRules<R extends EvaluableRule>(
  order: OrderFacts,
  rules: R[],
): Evaluation<R> {
  const matchedRules = rules.filter(
    (rule) => rule.enabled && ruleMatches(order, rule),
  );

  const tags: string[] = [];
  const seen = new Set<string>();
  for (const rule of matchedRules) {
    const tag = rule.tag.trim();
    if (!seen.has(tag.toLowerCase())) {
      seen.add(tag.toLowerCase());
      tags.push(tag);
    }
  }

  return { tags, matchedRules };
}

function ruleMatches(order: OrderFacts, rule: RuleInput): boolean {
  const value = rule.value.trim();

  switch (rule.field) {
    case "orderTotal":
      return compareTotal(order.total, rule.operator, Number(value));
    case "productTag":
      return rule.operator === "contains" && includesIgnoringCase(order.productTags, value);
    case "discountCode":
      return rule.operator === "eq" && includesIgnoringCase(order.discountCodes, value);
    default:
      return false;
  }
}

function compareTotal(total: number, operator: string, value: number): boolean {
  if (!Number.isFinite(value)) return false;

  switch (operator) {
    case "gt":
      return total > value;
    case "gte":
      return total >= value;
    case "lt":
      return total < value;
    case "lte":
      return total <= value;
    case "eq":
      return total === value;
    default:
      return false;
  }
}

function includesIgnoringCase(values: string[], target: string): boolean {
  const lowerTarget = target.toLowerCase();
  return values.some((value) => value.trim().toLowerCase() === lowerTarget);
}
