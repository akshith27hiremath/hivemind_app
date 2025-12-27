import { describe, it, expect } from "vitest";
import { GET } from "../health/route";

describe("Health API", () => {
  it("should return ok status", async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("ok");
    expect(data.timestamp).toBeDefined();
    expect(typeof data.uptime).toBe("number");
  });

  it("should return valid timestamp", async () => {
    const response = await GET();
    const data = await response.json();

    const timestamp = new Date(data.timestamp);
    expect(timestamp).toBeInstanceOf(Date);
    expect(timestamp.getTime()).not.toBeNaN();
  });

  it("should have positive uptime", async () => {
    const response = await GET();
    const data = await response.json();

    expect(data.uptime).toBeGreaterThanOrEqual(0);
  });
});
