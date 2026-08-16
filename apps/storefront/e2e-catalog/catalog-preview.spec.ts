import { mkdir } from "node:fs/promises";
import { expect, type Page, test } from "@playwright/test";

const HERBGARDEN = "Herbgarden 120 - namiot do uprawy 120x120x200cm";
const HERO_HEADING = /Wszystko, czego potrzebujesz do udanej uprawy/i;

async function captureHome(
  page: Page,
  viewport: { width: number; height: number },
  filename: string,
  minimumBytes: number,
) {
  await page.setViewportSize(viewport);
  await page.goto("/pl/pl", { waitUntil: "load" });
  await expect(
    page.getByRole("heading", { level: 1, name: HERO_HEADING }),
  ).toBeVisible();

  const search = page.getByRole("combobox").first();
  if ((await search.inputValue()) !== "") await search.fill("");

  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight),
  );
  await page.waitForTimeout(250);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(
    page.getByRole("heading", { level: 1, name: HERO_HEADING }),
  ).toBeVisible();

  const screenshot = await page.screenshot({
    path: `artifacts/catalog-preview/${filename}`,
    fullPage: true,
    animations: "disabled",
  });

  // A completely white 1440x1000 PNG is only a few KB. This guards the visual
  // artifact itself, not just DOM assertions, so a broken capture can never be
  // accepted as successful QA again.
  expect(screenshot.byteLength).toBeGreaterThan(minimumBytes);
}

test("catalog mode works without Spree and stays non-transactional", async ({
  page,
}) => {
  await mkdir("artifacts/catalog-preview", { recursive: true });

  await page.goto("/pl/pl");
  await expect(
    page.getByRole("heading", { level: 1, name: HERO_HEADING }),
  ).toBeVisible();

  const bubbleCard = page
    .locator(".product-carousel .swiper-slide")
    .filter({ hasText: "Bubble bags | Torby ekstrakcyjne 4x 20L" })
    .first();
  await expect(bubbleCard).toContainText(/149[,.]00/);
  await expect(bubbleCard).not.toContainText(/14[\s .]?900/);
  const bubbleImageSrc = await bubbleCard
    .locator("img")
    .first()
    .getAttribute("src");
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
  await page
    .getByRole("link", { name: /Jak zacząć uprawę indoor/i })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Jak zacząć uprawę indoor?" }),
  ).toBeVisible();

  await page.goto("/pl/pl/account");
  await expect(
    page.getByRole("heading", {
      name: /Konto klienta będzie dostępne przy uruchomieniu sprzedaży/i,
    }),
  ).toBeVisible();
  await page.goto("/pl/pl/account/orders");
  await expect(page).toHaveURL(/\/pl\/pl\/account$/);

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

  await page.goto("/pl/pl/checkout/catalog-preview-cart");
  await expect(page).toHaveURL(/\/pl\/pl\/cart$/);

  await page.goto("/pl/pl");
  const search = page.getByRole("combobox").first();
  await search.fill("oswietlenie");
  await search.press("Enter");
  await expect(page).toHaveURL(/\/products\?q=oswietlenie/);
  await expect(
    page.locator('main h3 a[href*="/products/"]').first(),
  ).toBeVisible();

  await page.goto("/pl/pl");
  const searchByButton = page.getByRole("combobox").first();
  await searchByButton.fill("wentylacja");
  await page
    .getByRole("button", { name: /Szukaj/i })
    .first()
    .click();
  await expect(page).toHaveURL(/\/products\?q=wentylacja/);

  await captureHome(
    page,
    { width: 1440, height: 1000 },
    "desktop-full.png",
    50_000,
  );
  await captureHome(
    page,
    { width: 390, height: 910 },
    "mobile-full.png",
    25_000,
  );
});
