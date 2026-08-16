"use server";

import type { ProductListParams } from "@spree/sdk";
import { cacheLife, cacheTag } from "next/cache";
import {
  getCatalogProduct,
  getCatalogProductFilters,
  listCatalogProducts,
} from "@/lib/commerce/catalog-provider";
import { isCatalogCommerce } from "@/lib/commerce/config";
import {
  cacheTagSuffix,
  DEFAULT_SURFACE,
  getAccessToken,
  getClientForSurface,
  getLocaleOptions,
  type Surface,
} from "@/lib/spree";

/**
 * Cached product list fetch. The DTC storefront may be backed by the local
 * Labuco catalog or by Spree. Both paths intentionally expose the same response
 * contract to the UI, so switching the backend cannot mutate page structure or
 * CSS behavior.
 */
export async function cachedListProducts(
  params: ProductListParams | undefined,
  options: { locale?: string; country?: string },
  surface: Surface,
  userToken?: string,
) {
  "use cache: remote";
  cacheLife("tenMinutes");
  cacheTag(`products${cacheTagSuffix(surface)}`);

  if (surface === "dtc" && isCatalogCommerce()) {
    return listCatalogProducts(params);
  }

  return getClientForSurface(surface).products.list(params, {
    ...options,
    ...(surface === "wholesale" && userToken
      ? { token: userToken }
      : undefined),
  });
}

export async function getProducts(
  params?: ProductListParams,
  surface: Surface = DEFAULT_SURFACE,
) {
  if (surface === "dtc" && isCatalogCommerce()) {
    return listCatalogProducts(params);
  }

  const options = await getLocaleOptions();
  const userToken = await getAccessToken();
  return cachedListProducts(params, options, surface, userToken);
}

export async function cachedGetProduct(
  slugOrId: string,
  expand: string[],
  options: { locale?: string; country?: string },
  surface: Surface,
  userToken?: string,
) {
  "use cache: remote";
  cacheLife("tenMinutes");
  cacheTag(
    `products${cacheTagSuffix(surface)}`,
    `product:${slugOrId}${cacheTagSuffix(surface)}`,
  );

  if (surface === "dtc" && isCatalogCommerce()) {
    return getCatalogProduct(slugOrId);
  }

  return getClientForSurface(surface).products.get(
    slugOrId,
    { expand },
    {
      ...options,
      ...(surface === "wholesale" && userToken
        ? { token: userToken }
        : undefined),
    },
  );
}

export async function getProduct(
  slugOrId: string,
  params?: { expand?: string[] },
  surface: Surface = DEFAULT_SURFACE,
) {
  if (surface === "dtc" && isCatalogCommerce()) {
    return getCatalogProduct(slugOrId);
  }

  const options = await getLocaleOptions();
  const userToken = await getAccessToken();
  return cachedGetProduct(
    slugOrId,
    params?.expand ?? [],
    options,
    surface,
    userToken,
  );
}

async function cachedGetProductFilters(
  params: Record<string, unknown> | undefined,
  options: { locale?: string; country?: string },
  surface: Surface,
  userToken?: string,
) {
  "use cache: remote";
  cacheLife("tenMinutes");
  cacheTag(`product-filters${cacheTagSuffix(surface)}`);

  if (surface === "dtc" && isCatalogCommerce()) {
    return getCatalogProductFilters();
  }

  return getClientForSurface(surface).products.filters(params, {
    ...options,
    ...(surface === "wholesale" && userToken
      ? { token: userToken }
      : undefined),
  });
}

export async function getProductFilters(
  params?: Record<string, unknown>,
  surface: Surface = DEFAULT_SURFACE,
) {
  if (surface === "dtc" && isCatalogCommerce()) {
    return getCatalogProductFilters();
  }

  const options = await getLocaleOptions();
  const userToken = await getAccessToken();
  return cachedGetProductFilters(params, options, surface, userToken);
}
