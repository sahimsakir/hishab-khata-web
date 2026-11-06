import { describe, it, expect } from "vitest";
import { parseMoney, decimal } from "./money";
describe("exact BDT amounts", () => {
  it("keeps 0.10 + 0.20 exact", () =>
    expect(parseMoney("0.10") + parseMoney("0.20")).toBe(30));
  it("formats without dropping paisa", () =>
    expect(decimal(123456)).toBe("1234.56"));
  it("rejects more than two decimal places", () =>
    expect(() => parseMoney("0.001")).toThrow());
  it("rejects exponent and negative input", () => {
    expect(() => parseMoney("1e3")).toThrow();
    expect(() => parseMoney("-1")).toThrow();
  });
});
