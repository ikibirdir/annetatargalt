import { describe, it, expect } from "vitest";
import { formatPercent, parsePercent } from "../percent";

describe("parsePercent", () => {
  it("reads whole and decimal percents, with a point or a comma", () => {
    expect(parsePercent("15")).toBe(15);
    expect(parsePercent(" 7.5 ")).toBe(7.5);
    expect(parsePercent("7,25")).toBe(7.25);
    expect(parsePercent("100")).toBe(100);
  });

  it("refuses what isn't a share of the donation", () => {
    expect(parsePercent("")).toBeNull();
    expect(parsePercent("0")).toBeNull();
    expect(parsePercent("101")).toBeNull();
    expect(parsePercent("-5")).toBeNull();
    expect(parsePercent("5%")).toBeNull();
    expect(parsePercent("1.234")).toBeNull();
    expect(parsePercent("abc")).toBeNull();
  });
});

describe("formatPercent", () => {
  it("writes the language's decimal mark", () => {
    expect(formatPercent(7.5, "en")).toBe("7.5");
    expect(formatPercent(7.5, "et")).toBe("7,5");
    expect(formatPercent(10, "et")).toBe("10");
  });
});
