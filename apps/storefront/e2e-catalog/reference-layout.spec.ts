import { expect, test } from "@playwright/test";

const HOME = "/pl/pl";

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(() => ({
    viewport: window.innerWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(overflow.scroll).toBeLessThanOrEqual(overflow.viewport + 1);
}

async function expectReferenceContent(page: import("@playwright/test").Page) {
  await expect(page.getByText("Dyskretna wysyłka", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("Bezpieczne płatności", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("Szybka dostawa", { exact: false }).first()).toBeVisible();
  await expect(page.getByRole("textbox", { name: /szukaj/i }).first()).toBeVisible();
  await expect(page.getByText("Popularne kategorie", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("Bestsellery", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("Poradniki i wiedza", { exact: false }).first()).toBeVisible();
}

test("mobile home follows compact reference hierarchy", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(HOME, { waitUntil: "networkidle" });
  await expectReferenceContent(page);
  await expectNoHorizontalOverflow(page);

  const service = page.locator(".labuco-service-bar");
  await expect(service).toBeVisible();
  const serviceBox = await service.boundingBox();
  expect(serviceBox).not.toBeNull();
  expect(serviceBox!.height).toBeLessThanOrEqual(40);

  const search = page.locator(".labuco-header-search form").first();
  await expect(search).toBeVisible();
  const searchBox = await search.boundingBox();
  expect(searchBox).not.toBeNull();
  expect(searchBox!.width).toBeGreaterThan(340);
  expect(searchBox!.height).toBeGreaterThanOrEqual(40);
  expect(searchBox!.height).toBeLessThanOrEqual(56);

  const bottom = page.locator("nav").filter({ hasText: "Start" }).filter({ hasText: "Kategorie" }).filter({ hasText: "Koszyk" }).last();
  await expect(bottom).toBeVisible();
  const bottomBox = await bottom.boundingBox();
  expect(bottomBox).not.toBeNull();
  expect(bottomBox!.y + bottomBox!.height).toBeGreaterThanOrEqual(820);

  await page.screenshot({ path: "artifacts/catalog-preview/reference-mobile.png", fullPage: true });
});

test("desktop home keeps the same system in a horizontal desktop shell", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(HOME, { waitUntil: "networkidle" });
  await expectReferenceContent(page);
  await expectNoHorizontalOverflow(page);

  const desktopNav = page.locator(".labuco-desktop-nav");
  await expect(desktopNav).toBeVisible();
  const navBox = await desktopNav.boundingBox();
  expect(navBox).not.toBeNull();
  expect(navBox!.height).toBeLessThanOrEqual(56);

  const headerMain = page.locator(".labuco-header-main");
  const headerBox = await headerMain.boundingBox();
  expect(headerBox).not.toBeNull();
  expect(headerBox!.width).toBeGreaterThan(1000);
  expect(headerBox!.height).toBeLessThanOrEqual(96);

  await page.screenshot({ path: "artifacts/catalog-preview/reference-desktop.png", fullPage: true });
});
