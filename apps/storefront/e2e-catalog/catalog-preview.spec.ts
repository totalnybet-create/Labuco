import { mkdir } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const HERBGARDEN = "Herbgarden 120 - namiot do uprawy 120x120x200cm";

test("catalog mode works without Spree and stays non-transactional", async ({
  page,
}) => {
  await mkdir("artifacts/catalog-preview", { recursive: true });

  await page.goto("/pl/pl");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /Wszystko, czego potrzebujesz do udanej uprawy/i,
    }),
  ).toBeVisible();

  const bubbleCard = page
    .locator(".product-carousel .swiper-slide")
    .filter({ hasText: "Bubble bags | Torby ekstrakcyjne 4x 20L" })
    .first();
  await expect(bubbleCard).toContainText(/149[,.]00/);
  await expect(bubbleCard).not.toContainText(/14[\s .]?900/);
  const bubbleImageSrc = await bubbleCard.locator("img").first().getAttribute("src");
  expect(bubbleImageSrc).toContain("growtent.pl");

  const herbgardenCard = page
    .locator(".product-carousel .swiper-slide")
    .filter({ hasText: HERBGARDEN })
    .first();
  await expect(herbgardenCard).toContainText(/549[,.]00/);
  await expect(herbgardenCard).not.toContainText(/54[\s .]?900/);

  await herbgardenCard
    .getByRole("button", { name: `Dodaj ${HERBGARDEN} do ulubionych` })
    .click();
  await page.goto("/pl/pl/ulubione");
  await expect(page.getByRole("heading", { name: "Ulubione" })).toBeVisible();
  await expect(page.getByText(HERBGARDEN).first()).toBeVisible();

  await page.goto("/pl/pl");
  await page.getByRole("link", { name: /Poradniki uprawy/i }).click();
  await expect(page).toHaveURL(/\/pl\/pl\/poradniki$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Poradniki i wiedza" }),
  ).toBeVisible();
  await page.getByRole("link", { name: /Jak zacząć uprawę indoor/i }).first().click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Jak zacząć uprawę indoor?" }),
  ).toBeVisible();

  await page.goto("/pl/pl");
  const liveCard = page
    .locator(".product-carousel .swiper-slide")
    .filter({ hasText: HERBGARDEN })
    .first();
  await liveCard
    .getByRole("button", { name: `Dodaj ${HERBGARDEN} do koszyka` })
    .click();
  await page.goto("/pl/pl/cart");
  await expect(page.getByText(HERBGARDEN).first()).toBeVisible();
  await expect(
    page.getByText(/To bezpieczny koszyk podglądowy/i),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Przejdź do kasy|Checkout/i }),
  ).toHaveCount(0);

  await page.goto("/pl/pl");
  const search = page.getByRole("combobox").first();
  await search.fill("oswietlenie");
  await search.press("Enter");
  await expect(page).toHaveURL(/\/products\?q=oswietlenie/);
  await expect(page.locator('main h3 a[href*="/products/"]').first()).toBeVisible();

  await page.goto("/pl/pl");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: "artifacts/catalog-preview/desktop-full.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 910 });
  await page.screenshot({
    path: "artifacts/catalog-preview/mobile-full.png",
    fullPage: true,
  });
});
