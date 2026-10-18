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

export type RuleField = keyof typeof RULE_OPERATORS;
export type RuleOperator = (typeof RULE_OPERATORS)[RuleField][number];

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
