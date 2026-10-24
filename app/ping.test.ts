import { describe, expect, it } from "vitest";
import { loader } from "./routes/ping";

describe("GET /ping", () => {
  it("returns 200 with status ok and the current time", async () => {
    const response = loader();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("ok");
    expect(Number.isNaN(Date.parse(body.time))).toBe(false);
  });

  it("is never cached", () => {
    expect(loader().headers.get("Cache-Control")).toBe("no-store");
  });
});
