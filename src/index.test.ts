import { describe, expect, it } from "vitest";
import { TheCitadelService } from "./index";

describe("TheCitadelService", () => {
  it("returns active status", () => {
    const service = new TheCitadelService();
    expect(service.getStatus()).toEqual({ name: "the-citadel", status: "active" });
  });
});
