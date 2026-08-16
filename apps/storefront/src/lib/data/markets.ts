"use server";

import type { Market } from "@spree/sdk";
import { cacheLife, cacheTag } from "next/cache";
import { getCatalogMarket } from "@/lib/commerce/catalog-provider";
import { isCatalogCommerce } from "@/lib/commerce/config";
import { getClient, getLocaleOptions } from "@/lib/spree";

async function cachedListMarkets(options: {
  locale?: string;
  country?: string;
}) {
  "use cache: remote";
  cacheLife("hours");
  cacheTag("markets");

  if (isCatalogCommerce()) return { data: [getCatalogMarket()] };
  return getClient().markets.list(options);
}

async function cachedResolveMarket(
  country: string,
  options: { locale?: string; country?: string },
) {
  "use cache: remote";
  cacheLife("hours");
  cacheTag("resolved-market");

  if (isCatalogCommerce()) {
    const market = getCatalogMarket();
    const served = market.countries?.some(
      (candidate) => candidate.iso.toLowerCase() === country.toLowerCase(),
    );
    if (!served) throw new Error(`Catalog market does not serve ${country}`);
    return market;
  }

  return getClient().markets.resolve(country, options);
}

async function cachedListMarketCountries(
  marketId: string,
  options: { locale?: string; country?: string },
) {
  "use cache: remote";
  cacheLife("hours");
  cacheTag("market-countries");

  if (isCatalogCommerce()) {
    const market = getCatalogMarket();
    if (market.id !== marketId) return { data: [] };
    return { data: market.countries ?? [] };
  }

  return getClient().markets.countries.list(marketId, options);
}

export async function getMarkets(options?: {
  locale?: string;
  country?: string;
}): Promise<{ data: Market[] }> {
  if (isCatalogCommerce()) return { data: [getCatalogMarket()] };
  const resolvedOptions = options ?? (await getLocaleOptions());
  return cachedListMarkets(resolvedOptions);
}

export async function resolveMarket(country: string) {
  if (isCatalogCommerce()) {
    const market = getCatalogMarket();
    const served = market.countries?.some(
      (candidate) => candidate.iso.toLowerCase() === country.toLowerCase(),
    );
    if (!served) throw new Error(`Catalog market does not serve ${country}`);
    return market;
  }

  const options = await getLocaleOptions();
  return cachedResolveMarket(country, options);
}

export async function getMarketCountries(marketId: string) {
  if (isCatalogCommerce()) {
    const market = getCatalogMarket();
    return { data: market.id === marketId ? (market.countries ?? []) : [] };
  }

  const options = await getLocaleOptions();
  return cachedListMarketCountries(marketId, options);
}

export async function resolveCurrency(
  country: string,
): Promise<string | undefined> {
  const { data: markets } = await getMarkets();
  const iso = country.toLowerCase();
  for (const market of markets) {
    const match = market.countries?.some((c) => c.iso.toLowerCase() === iso);
    if (match) return market.currency;
  }
  return undefined;
}
