"use server";

import type { Category, Media, Product } from "@spree/sdk";
import { cacheLife, cacheTag } from "next/cache";
import {
  getCatalogCategories,
  getCatalogMarket,
  listCatalogProducts,
} from "@/lib/commerce/catalog-provider";
import { isCatalogCommerce } from "@/lib/commerce/config";
import { getClient } from "@/lib/spree";

interface LocaleOptions {
  locale: string;
  country: string;
}

export type SitemapProduct = Product & {
  media?: Media[];
  updated_at?: string;
};

export type SitemapCategory = Category & {
  updated_at?: string;
};

export type SitemapResource = "products" | "categories";

export async function getSitemapMarkets(options: LocaleOptions) {
  "use cache: remote";
  cacheLife("hours");
  cacheTag("markets", "sitemap");

  if (isCatalogCommerce()) return [getCatalogMarket()];
  return (await getClient().markets.list(options)).data;
}

export async function getSitemapResourceCount(
  resource: SitemapResource,
  marketId: string,
  options: LocaleOptions,
): Promise<number> {
  "use cache: remote";
  cacheLife("tenMinutes");
  cacheTag("sitemap", resource, `sitemap-market:${marketId}`);

  if (isCatalogCommerce()) {
    if (resource === "products") {
      return (await listCatalogProducts({ page: 1, limit: 1 })).meta.count;
    }
    return (await getCatalogCategories()).data.length;
  }

  const response =
    resource === "products"
      ? await getClient().products.list({ page: 1, limit: 1 }, options)
      : await getClient().categories.list(
          { page: 1, limit: 1, parent_id_not_null: true },
          options,
        );
  return Math.max(0, response.meta.count);
}

export async function getSitemapProductPage(
  marketId: string,
  page: number,
  limit: number,
  options: LocaleOptions,
): Promise<SitemapProduct[]> {
  "use cache: remote";
  cacheLife("tenMinutes");
  cacheTag("sitemap", "products", `sitemap-market:${marketId}`);

  if (isCatalogCommerce()) {
    return (await listCatalogProducts({ page, limit })).data as SitemapProduct[];
  }

  const response = await getClient().products.list(
    { page, limit, expand: ["media"] },
    options,
  );
  return response.data as SitemapProduct[];
}

export async function getSitemapCategoryPage(
  marketId: string,
  page: number,
  limit: number,
  options: LocaleOptions,
): Promise<SitemapCategory[]> {
  "use cache: remote";
  cacheLife("tenMinutes");
  cacheTag("sitemap", "categories", `sitemap-market:${marketId}`);

  if (isCatalogCommerce()) {
    const categories = (await getCatalogCategories()).data;
    const start = Math.max(0, page - 1) * limit;
    return categories.slice(start, start + limit) as SitemapCategory[];
  }

  const response = await getClient().categories.list(
    { page, limit, parent_id_not_null: true },
    options,
  );
  return response.data;
}
