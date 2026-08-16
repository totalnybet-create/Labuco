import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import type {
  Category,
  Market,
  PaginatedResponse,
  Product,
  ProductFiltersResponse,
  ProductListParams,
} from "@spree/sdk";

interface CatalogRecord {
  labuco_sku: string;
  source_id?: string;
  brand?: string;
  title: string;
  short_description?: string;
  description?: string;
  category?: string;
  labuco_price_pln: string;
  reference_image?: string;
  final_image_status?: string;
  raw?: {
    availability?: string;
  };
}

let catalogPromise: Promise<CatalogRecord[]> | undefined;

function candidateCatalogPaths(): string[] {
  const explicit = process.env.LABUCO_CATALOG_PATH?.trim();
  return [
    explicit,
    path.resolve(process.cwd(), "../../data/labuco_catalog.json"),
    path.resolve(process.cwd(), "data/labuco_catalog.json"),
    path.resolve(process.cwd(), "../data/labuco_catalog.json"),
  ].filter((value): value is string => Boolean(value));
}

async function readCatalogFile(): Promise<CatalogRecord[]> {
  let lastError: unknown;
  for (const filename of candidateCatalogPaths()) {
    try {
      const raw = await readFile(filename, "utf8");
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        throw new Error(`Catalog at ${filename} is not an array`);
      }
      return parsed as CatalogRecord[];
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    `Unable to load Labuco catalog. Checked: ${candidateCatalogPaths().join(", ")}. ${String(lastError ?? "")}`,
  );
}

export function loadCatalog(): Promise<CatalogRecord[]> {
  catalogPromise ??= readCatalogFile();
  return catalogPromise;
}

export function slugifyCatalogValue(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

export function catalogCategoryId(category: string): string {
  return `catalog-cat-${slugifyCatalogValue(category)}`;
}

export function catalogProductSlug(record: CatalogRecord): string {
  const suffix = record.source_id || record.labuco_sku.replace(/^LAB-/, "");
  return `${slugifyCatalogValue(record.title)}-${suffix}`;
}

export function catalogPrice(amount: string) {
  const numeric = Number.parseFloat(amount);
  const safeAmount = Number.isFinite(numeric) ? numeric : 0;
  const amountInCents = Math.round(safeAmount * 100);

  return {
    amount: safeAmount.toFixed(2),
    amount_in_cents: amountInCents,
    currency: "PLN",
    display_amount: new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency: "PLN",
      minimumFractionDigits: 2,
    }).format(safeAmount),
    compare_at_amount: null,
    compare_at_amount_in_cents: null,
    display_compare_at_amount: null,
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function categoryForRecord(record: CatalogRecord): Category | undefined {
  const name = record.category?.trim();
  if (!name) return undefined;
  const permalink = slugifyCatalogValue(name);
  return {
    id: catalogCategoryId(name),
    name,
    permalink,
    description: null,
    image_url: null,
    children: [],
    ancestors: [],
  } as unknown as Category;
}

function isRecordInStock(record: CatalogRecord): boolean {
  return record.raw?.availability !== "OutOfStock";
}

export function mapCatalogRecordToProduct(record: CatalogRecord): Product {
  const price = catalogPrice(record.labuco_price_pln);
  const variantId = `catalog-variant-${record.labuco_sku}`;
  const inStock = isRecordInStock(record);
  const category = categoryForRecord(record);
  const image = record.reference_image?.trim() || null;
  const description = record.description?.trim() || record.short_description?.trim() || "";

  const variant = {
    id: variantId,
    sku: record.labuco_sku,
    name: record.title,
    purchasable: inStock,
    in_stock: inStock,
    options_text: "",
    option_values: [],
    price,
    original_price: null,
  };

  const media = image
    ? [
        {
          id: `catalog-media-${record.labuco_sku}`,
          alt: record.title,
          original_url: image,
          mini_url: image,
          small_url: image,
          medium_url: image,
          large_url: image,
          xlarge_url: image,
          variant_ids: [variantId],
        },
      ]
    : [];

  return {
    id: record.labuco_sku,
    name: record.title,
    slug: catalogProductSlug(record),
    description,
    description_html: description
      ? `<p>${escapeHtml(description).replaceAll("\n", "<br />")}</p>`
      : "",
    thumbnail_url: image,
    purchasable: inStock,
    in_stock: inStock,
    default_variant_id: variantId,
    default_variant: variant,
    variants: [variant],
    option_types: [],
    media,
    price,
    original_price: null,
    categories: category ? [category] : [],
    custom_fields: {
      brand: record.brand || "",
      source_id: record.source_id || "",
    },
  } as unknown as Product;
}

function normalizeParams(params?: ProductListParams): Record<string, unknown> {
  return (params ?? {}) as Record<string, unknown>;
}

function numericParam(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function stringParam(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function sortCatalog(records: CatalogRecord[], sort?: string): CatalogRecord[] {
  if (!sort || sort === "manual" || sort === "best_selling") return records;

  const direction = sort.startsWith("-") || sort.endsWith(" desc") ? -1 : 1;
  const normalized = sort.replace(/^-/, "").replace(/\s+(asc|desc)$/i, "");

  return [...records].sort((a, b) => {
    if (normalized === "price") {
      return (
        (Number.parseFloat(a.labuco_price_pln) - Number.parseFloat(b.labuco_price_pln)) *
        direction
      );
    }
    if (normalized === "name") {
      return a.title.localeCompare(b.title, "pl") * direction;
    }
    if (normalized === "available_on") {
      return (a.labuco_sku.localeCompare(b.labuco_sku) || 0) * direction;
    }
    return 0;
  });
}

export async function listCatalogProducts(
  params?: ProductListParams,
): Promise<PaginatedResponse<Product>> {
  const all = await loadCatalog();
  const p = normalizeParams(params);
  const search = stringParam(p.search)?.toLocaleLowerCase("pl");
  const categoryId = stringParam(p.in_category);
  const minPrice = numericParam(p.price_gte);
  const maxPrice = numericParam(p.price_lte);
  const requireInStock = p.in_stock === true || p.in_stock === "true";
  const requireOutOfStock = p.out_of_stock === true || p.out_of_stock === "true";

  let filtered = all.filter((record) => {
    const haystack = `${record.title} ${record.brand ?? ""} ${record.category ?? ""}`.toLocaleLowerCase("pl");
    if (search && !haystack.includes(search)) return false;

    if (categoryId && record.category && catalogCategoryId(record.category) !== categoryId) {
      return false;
    }

    const price = Number.parseFloat(record.labuco_price_pln);
    if (minPrice !== undefined && price < minPrice) return false;
    if (maxPrice !== undefined && price > maxPrice) return false;

    const inStock = isRecordInStock(record);
    if (requireInStock && !inStock) return false;
    if (requireOutOfStock && inStock) return false;

    return true;
  });

  filtered = sortCatalog(filtered, stringParam(p.sort));

  const limit = Math.max(1, Math.min(100, numericParam(p.limit) ?? 24));
  const page = Math.max(1, numericParam(p.page) ?? 1);
  const count = filtered.length;
  const pages = Math.max(1, Math.ceil(count / limit));
  const start = (page - 1) * limit;
  const data = filtered.slice(start, start + limit).map(mapCatalogRecordToProduct);

  return {
    data,
    meta: {
      count,
      pages,
      current_page: page,
      per_page: limit,
    },
  } as unknown as PaginatedResponse<Product>;
}

export async function getCatalogProduct(slugOrId: string): Promise<Product> {
  const all = await loadCatalog();
  const record = all.find(
    (candidate) =>
      candidate.labuco_sku === slugOrId ||
      catalogProductSlug(candidate) === slugOrId,
  );

  if (!record) throw new Error(`Catalog product not found: ${slugOrId}`);
  return mapCatalogRecordToProduct(record);
}

export async function getCatalogCategories(): Promise<{ data: Category[] }> {
  const all = await loadCatalog();
  const names = [...new Set(all.map((record) => record.category?.trim()).filter(Boolean))] as string[];
  const data = names
    .sort((a, b) => a.localeCompare(b, "pl"))
    .map((name) => categoryForRecord({
      labuco_sku: `category-${catalogCategoryId(name)}`,
      title: name,
      category: name,
      labuco_price_pln: "0",
    }) as Category);
  return { data };
}

export async function getCatalogCategory(idOrPermalink: string): Promise<Category> {
  const { data } = await getCatalogCategories();
  const category = data.find(
    (candidate) =>
      candidate.id === idOrPermalink || candidate.permalink === idOrPermalink,
  );
  if (!category) throw new Error(`Catalog category not found: ${idOrPermalink}`);
  return category;
}

export async function getCatalogProductFilters(): Promise<ProductFiltersResponse> {
  const all = await loadCatalog();
  const prices = all.map((record) => Number.parseFloat(record.labuco_price_pln)).filter(Number.isFinite);
  const min = prices.length ? Math.min(...prices) : 0;
  const max = prices.length ? Math.max(...prices) : 0;
  const inStockCount = all.filter(isRecordInStock).length;
  const outOfStockCount = all.length - inStockCount;

  return {
    filters: [
      {
        id: "price",
        type: "price_range",
        label: "Cena",
        min,
        max,
        currency: "PLN",
      },
      {
        id: "availability",
        type: "availability",
        label: "Dostępność",
        options: [
          { id: "in_stock", count: inStockCount },
          { id: "out_of_stock", count: outOfStockCount },
        ],
      },
    ],
    sort_options: [
      { id: "manual" },
      { id: "price" },
      { id: "-price" },
      { id: "name" },
      { id: "-name" },
    ],
    default_sort: "manual",
  } as unknown as ProductFiltersResponse;
}

export function getCatalogMarket(): Market {
  return {
    id: "catalog-market-pl",
    name: "Polska",
    currency: "PLN",
    default: true,
    default_locale: "pl",
    supported_locales: ["pl"],
    countries: [
      {
        id: "catalog-country-pl",
        iso: "PL",
        iso3: "POL",
        name: "Polska",
      },
    ],
  } as unknown as Market;
}
