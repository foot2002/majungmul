import { describe, expect, it } from "vitest";
import { applyMenuImport, menuReviewItems, parseMenuPrice } from "@/lib/ai/menu-import";
import { outputSchemas } from "@/lib/ai/contracts";

describe("menu photo import", () => {
  it("keeps unreadable prices distinct from explicitly free items", () => {
    expect(
      menuReviewItems([
        { name: " 케이크 ", price: null },
        { name: "생수", price: 0 },
      ]),
    ).toEqual([
      { name: "케이크", price: "", ok: false },
      { name: "생수", price: "0", ok: true },
    ]);
  });
  it("accepts won formatting without silently turning ambiguous or invalid prices into valid amounts", () => {
    expect(parseMenuPrice("₩4,500원")).toBe(4500);
    expect(parseMenuPrice("0")).toBe(0);
    for (const price of ["", "-4500", "4.5", "45,00", "가격 문의", "1e3"])
      expect(parseMenuPrice(price)).toBeNull();
  });
  it("merges checked and edited items, updating duplicate names without losing existing menus", () => {
    const existing = [
      { name: "카페 라떼", price: 4500 },
      { name: "차", price: 4000 },
    ];
    const review = [
      { name: " 카페라떼 ", price: "5,000", ok: true },
      { name: "생수", price: "0", ok: true },
      { name: "케이크", price: "", ok: false },
    ];
    const result = applyMenuImport(existing, review);
    expect(result).toEqual({
      menu: [
        { name: "카페 라떼", price: 5000 },
        { name: "차", price: 4000 },
        { name: "생수", price: 0 },
      ],
      added: 1,
      updated: 1,
    });
    expect(existing[0]?.price).toBe(4500);
    expect(applyMenuImport(result.menu, review)).toMatchObject({ added: 0, updated: 0 });
  });
  it("rejects an invalid selection before applying any changes", () => {
    const existing = [{ name: "커피", price: 4000 }];
    expect(() =>
      applyMenuImport(existing, [
        { name: "커피", price: "4500", ok: true },
        { name: "케이크", price: "", ok: true },
      ]),
    ).toThrow("가격");
    expect(existing).toEqual([{ name: "커피", price: 4000 }]);
    expect(() => applyMenuImport(existing, [])).toThrow("체크");
  });
  it("rejects malformed OCR prices at the server contract", () => {
    for (const price of [-1, 4.5, "4,500"])
      expect(outputSchemas.menu.safeParse({ items: [{ name: "커피", price }] }).success).toBe(
        false,
      );
    expect(outputSchemas.menu.safeParse({ items: [{ name: "커피", price: null }] }).success).toBe(
      true,
    );
  });
});
