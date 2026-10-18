import { describe, expect, it } from "vitest";
import {
  evaluateRules,
  validateRule,
  type EvaluableRule,
  type OrderFacts,
} from "./rules";

function order(facts: Partial<OrderFacts> = {}): OrderFacts {
  return { total: 0, productTags: [], discountCodes: [], ...facts };
}

function rule(fields: Partial<EvaluableRule> = {}): EvaluableRule {
  return {
    field: "orderTotal",
    operator: "gt",
    value: "100",
    tag: "high-value",
    enabled: true,
    ...fields,
  };
}

describe("evaluateRules", () => {
  describe("orderTotal", () => {
    it.each([
      ["gt", 100.01, true],
      ["gt", 100, false],
      ["gte", 100, true],
      ["gte", 99.99, false],
      ["lt", 99.99, true],
      ["lt", 100, false],
      ["lte", 100, true],
      ["lte", 100.01, false],
      ["eq", 100, true],
      ["eq", 100.01, false],
    ])("%s 100 with total %s matches: %s", (operator, total, expected) => {
      const result = evaluateRules(order({ total }), [rule({ operator })]);
      expect(result.tags).toEqual(expected ? ["high-value"] : []);
    });

    it("compares decimal values", () => {
      const result = evaluateRules(order({ total: 99.5 }), [
        rule({ operator: "gt", value: "99.49" }),
      ]);
      expect(result.tags).toEqual(["high-value"]);
    });

    it("never matches when the value isn't a number", () => {
      const result = evaluateRules(order({ total: 500 }), [
        rule({ value: "lots" }),
      ]);
      expect(result.tags).toEqual([]);
    });
  });

  describe("productTag", () => {
    const winterRule = rule({
      field: "productTag",
      operator: "contains",
      value: "Winter",
      tag: "winter-order",
    });

    it("matches when any product has the tag", () => {
      const result = evaluateRules(
        order({ productTags: ["Sport", "Winter"] }),
        [winterRule],
      );
      expect(result.tags).toEqual(["winter-order"]);
    });

    it("ignores case", () => {
      const result = evaluateRules(order({ productTags: ["winter"] }), [
        winterRule,
      ]);
      expect(result.tags).toEqual(["winter-order"]);
    });

    it("needs the whole tag, not part of it", () => {
      const result = evaluateRules(order({ productTags: ["Winterwear"] }), [
        winterRule,
      ]);
      expect(result.tags).toEqual([]);
    });

    it("doesn't match when no product has the tag", () => {
      const result = evaluateRules(order({ productTags: ["Sport"] }), [
        winterRule,
      ]);
      expect(result.tags).toEqual([]);
    });
  });

  describe("discountCode", () => {
    const promoRule = rule({
      field: "discountCode",
      operator: "eq",
      value: "TEST10",
      tag: "promo-test10",
    });

    it("matches when the code was used", () => {
      const result = evaluateRules(order({ discountCodes: ["TEST10"] }), [
        promoRule,
      ]);
      expect(result.tags).toEqual(["promo-test10"]);
    });

    it("ignores case", () => {
      const result = evaluateRules(order({ discountCodes: ["test10"] }), [
        promoRule,
      ]);
      expect(result.tags).toEqual(["promo-test10"]);
    });

    it("doesn't match a different code", () => {
      const result = evaluateRules(order({ discountCodes: ["SUMMER"] }), [
        promoRule,
      ]);
      expect(result.tags).toEqual([]);
    });
  });

  describe("edge cases", () => {
    it("returns nothing when there are no rules", () => {
      const result = evaluateRules(order({ total: 500 }), []);
      expect(result).toEqual({ tags: [], matchedRules: [] });
    });

    it("skips disabled rules", () => {
      const result = evaluateRules(order({ total: 500 }), [
        rule({ enabled: false }),
      ]);
      expect(result.tags).toEqual([]);
    });

    it("handles an order with no line items", () => {
      const noItems = order({ total: 0, productTags: [], discountCodes: [] });
      const result = evaluateRules(noItems, [
        rule({ field: "productTag", operator: "contains", value: "Winter" }),
        rule({ operator: "lt", value: "1", tag: "free-order" }),
      ]);
      expect(result.tags).toEqual(["free-order"]);
    });

    it("adds a tag for every matching rule", () => {
      const rules = [
        rule({ tag: "high-value" }),
        rule({
          field: "discountCode",
          operator: "eq",
          value: "TEST10",
          tag: "promo",
        }),
        rule({ operator: "lt", value: "50", tag: "small" }),
      ];
      const result = evaluateRules(
        order({ total: 150, discountCodes: ["TEST10"] }),
        rules,
      );
      expect(result.tags).toEqual(["high-value", "promo"]);
      expect(result.matchedRules).toEqual([rules[0], rules[1]]);
    });

    it("adds a tag once when several rules give the same tag", () => {
      const result = evaluateRules(order({ total: 150 }), [
        rule({ tag: "vip" }),
        rule({ operator: "gte", value: "150", tag: "VIP" }),
      ]);
      expect(result.tags).toEqual(["vip"]);
      expect(result.matchedRules).toHaveLength(2);
    });

    it("never matches an unknown field or operator", () => {
      const result = evaluateRules(order({ total: 500 }), [
        rule({ field: "customerEmail" }),
        rule({ operator: "contains" }),
      ]);
      expect(result.tags).toEqual([]);
    });
  });
});

describe("validateRule", () => {
  const valid = { field: "orderTotal", operator: "gt", value: "100", tag: "high-value" };

  it("accepts a valid rule for each field", () => {
    expect(validateRule(valid)).toEqual([]);
    expect(
      validateRule({ field: "productTag", operator: "contains", value: "Winter", tag: "w" }),
    ).toEqual([]);
    expect(
      validateRule({ field: "discountCode", operator: "eq", value: "TEST10", tag: "p" }),
    ).toEqual([]);
  });

  it("rejects an unknown field", () => {
    expect(validateRule({ ...valid, field: "customerEmail" })).toEqual([
      'Unknown field "customerEmail".',
    ]);
  });

  it("rejects an operator the field doesn't allow", () => {
    expect(validateRule({ ...valid, field: "productTag", operator: "gt" })).toEqual([
      'Operator "gt" can\'t be used with productTag.',
    ]);
  });

  it("rejects a non-numeric order total", () => {
    expect(validateRule({ ...valid, value: "lots" })).toEqual([
      "Order total must be a number.",
    ]);
  });

  it("rejects an empty value and tag", () => {
    expect(
      validateRule({ field: "discountCode", operator: "eq", value: " ", tag: "" }),
    ).toEqual(["Value is required.", "Tag is required."]);
  });
});
