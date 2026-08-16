"use server";

import type { CategoryListParams, ProductListParams } from "@spree/sdk";
import { cacheLife, cacheTag } from "next/cache";
import {
  getCatalogCategories,
  getCatalogCategory,
  listCatalogProducts,
} from "@/lib/commerce/catalog-provider";
import { isCatalogCommerce } from "@/lib/commerce/config";
import { getAccessToken, getClient, getLocaleOptions } from "@/lib/spree";

async function cachedListCategories(
  params: CategoryListParams | undefined,
  options: { locale?: string; country?: string },
) {
  "use cache: remote";
  cacheLife("hours");
  cacheTag("categories");

  if (isCatalogCommerce()) return getCatalogCategories();
  return getClient().categories.list(params, options);
}

export async function getCategories(
  params?: CategoryListParams,
  options?: { locale?: string; country?: string },
) {
  if (isCatalogCommerce()) return getCatalogCategories();
  const localeOptions = options ?? (await getLocaleOptions());
  return cachedListCategories(params, localeOptions);
}

export async function cachedGetCategory(
  idOrPermalink: string,
  params: { expand?: string[] } | undefined,
  options: { locale?: string; country?: string },
) {
  "use cache: remote";
  cacheLife("tenMinutes");
  cacheTag("category");

  if (isCatalogCommerce()) return getCatalogCategory(idOrPermalink);
  return getClient().categories.get(idOrPermalink, params, options);
}

export async function getCategory(
  idOrPermalink: string,
  params?: { expand?: string[] },
) {
  if (isCatalogCommerce()) return getCatalogCategory(idOrPermalink);
  const options = await getLocaleOptions();
  return cachedGetCategory(idOrPermalink, params, options);
}

async function cachedListCategoryProducts(
  categoryId: string,
  params: ProductListParams | undefined,
  options: { locale?: string; country?: string },
  _userToken?: string,
) {
  "use cache: remote";
  cacheLife("tenMinutes");
  cacheTag("products", `category-products:${categoryId}`);

  if (isCatalogCommerce()) {
    return listCatalogProducts({ ...params, in_category: categoryId });
  }

  return getClient().products.list(
    { ...params, in_category: categoryId },
    options,
  );
}

export async function getCategoryProducts(
  categoryId: string,
  params?: ProductListParams,
) {
  if (isCatalogCommerce()) {
    return listCatalogProducts({ ...params, in_category: categoryId });
  }

  const options = await getLocaleOptions();
  const userToken = await getAccessToken();
  return cachedListCategoryProducts(categoryId, params, options, userToken);
}
