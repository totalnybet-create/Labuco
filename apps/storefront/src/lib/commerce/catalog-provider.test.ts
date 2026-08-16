import { describe, expect, it } from "vitest";
import {
  catalogPrice,
  catalogProductSlug,
  listCatalogProducts,
  mapCatalogRecordToProduct,
} from "./catalog-provider";

describe("catalog commerce contract", () => {
  it("keeps PLN major units and cents separate", () => {
    const price = catalogPrice("149.00");
    expect(price.amount).toBe("149.00");
    expect(price.amount_in_cents).toBe(14900);
    expect(price.display_amount).toContain("149");
    expect(price.display_amount).not.toContain("14 900");
  });

  it("creates deterministic product slugs", () => {
    expect(
      catalogProductSlug({
        labuco_sku: "LAB-00071",
        source_id: "71",
        title: "Herbgarden 120 - namiot do uprawy 120x120x200cm",
        labuco_price_pln: "549.00",
      }),
    ).toBe("herbgarden-120-namiot-do-uprawy-120x120x200cm-71");
  });

  it("maps source images and exact prices into the UI product contract", () => {
    const product = mapCatalogRecordToProduct({
      labuco_sku: "LAB-00041",
      source_id: "41",
      title: "Bubble bags | Torby ekstrakcyjne 4x 20L",
      description: "Testowy opis",
      category: "Akcesoria do uprawy",
      labuco_price_pln: "149.00",
      reference_image: "https://www.growtent.pl/hpeciai/example.webp",
      raw: { availability: "InStock" },
    });

    expect(product.thumbnail_url).toBe(
      "https://www.growtent.pl/hpeciai/example.webp",
    );
    expect(product.price?.amount_in_cents).toBe(14900);
    expect(product.price?.display_amount).toContain("149");
    expect(product.default_variant?.price?.amount_in_cents).toBe(14900);
    expect(product.purchasable).toBe(true);
  });

  it("matches Polish catalog text when the query omits diacritics", async () => {
    const result = await listCatalogProducts({
      search: "oswietlenie",
      limit: 10,
    });
    expect(result.data.length).toBeGreaterThan(0);
  });
});
