import { describe, expect, it } from "vitest";
import { toOrderGids } from "./compliance.server";

describe("toOrderGids", () => {
  it("converts numeric order IDs from compliance payloads to GraphQL IDs", () => {
    expect(toOrderGids([299938, 280263])).toEqual([
      "gid://shopify/Order/299938",
      "gid://shopify/Order/280263",
    ]);
  });

  it("returns an empty list when the payload has no orders", () => {
    expect(toOrderGids(undefined)).toEqual([]);
    expect(toOrderGids([])).toEqual([]);
  });
});
