import type { Cart, LineItem, Product } from "@spree/sdk";
import { cookies } from "next/headers";
import { getCatalogProduct } from "@/lib/commerce/catalog-provider";

const COOKIE_NAME = "labuco_catalog_cart_v1";

interface CatalogCartEntry {
  variantId: string;
  quantity: number;
}

interface CatalogCartState {
  items: CatalogCartEntry[];
}

function emptyState(): CatalogCartState {
  return { items: [] };
}

async function readState(): Promise<CatalogCartState | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CatalogCartState;
    if (!Array.isArray(parsed.items)) return null;
    return {
      items: parsed.items
        .filter(
          (item) =>
            typeof item?.variantId === "string" &&
            Number.isInteger(item.quantity) &&
            item.quantity > 0,
        )
        .slice(0, 100),
    };
  } catch {
    return null;
  }
}

async function writeState(state: CatalogCartState): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, JSON.stringify(state), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearCatalogCart(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

function skuFromVariantId(variantId: string): string {
  const prefix = "catalog-variant-";
  if (!variantId.startsWith(prefix)) {
    throw new Error(`Unsupported catalog variant: ${variantId}`);
  }
  return variantId.slice(prefix.length);
}

function formatPln(amount: number): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    minimumFractionDigits: 2,
  }).format(amount);
}

async function lineItemFor(entry: CatalogCartEntry): Promise<LineItem | null> {
  let product: Product;
  try {
    product = await getCatalogProduct(skuFromVariantId(entry.variantId));
  } catch {
    return null;
  }

  const unit = Number.parseFloat(product.price?.amount ?? "0");
  const total = unit * entry.quantity;

  return {
    id: entry.variantId,
    variant_id: entry.variantId,
    product_id: product.id,
    name: product.name,
    quantity: entry.quantity,
    price: unit.toFixed(2),
    display_price: product.price?.display_amount ?? formatPln(unit),
    total: total.toFixed(2),
    display_total: formatPln(total),
    thumbnail_url: product.thumbnail_url ?? null,
    options_text: "",
    variant: product.default_variant,
    product,
  } as unknown as LineItem;
}

async function buildCart(state: CatalogCartState): Promise<Cart> {
  const items = (
    await Promise.all(state.items.map((entry) => lineItemFor(entry)))
  ).filter((item): item is LineItem => item !== null);

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const itemTotal = items.reduce(
    (sum, item) => sum + Number.parseFloat(item.total ?? "0"),
    0,
  );
  const amount = itemTotal.toFixed(2);
  const display = formatPln(itemTotal);

  return {
    id: "catalog-preview-cart",
    token: "catalog-preview",
    currency: "PLN",
    state: "cart",
    items,
    total_quantity: totalQuantity,
    item_total: amount,
    display_item_total: display,
    total: amount,
    display_total: display,
    amount_due: amount,
    display_amount_due: display,
    discount_total: "0.00",
    display_discount_total: formatPln(0),
    delivery_total: "0.00",
    display_delivery_total: formatPln(0),
    tax_total: "0.00",
    display_tax_total: formatPln(0),
    gift_card_total: "0.00",
    display_gift_card_total: formatPln(0),
    store_credit_total: "0.00",
    display_store_credit_total: formatPln(0),
  } as unknown as Cart;
}

export async function getCatalogCart(): Promise<Cart | null> {
  const state = await readState();
  return state ? buildCart(state) : null;
}

export async function getOrCreateCatalogCart(): Promise<Cart> {
  return buildCart((await readState()) ?? emptyState());
}

export async function addCatalogCartItem(
  variantId: string,
  quantity: number,
): Promise<Cart> {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    throw new Error("Invalid quantity");
  }
  await getCatalogProduct(skuFromVariantId(variantId));

  const state = (await readState()) ?? emptyState();
  const existing = state.items.find((item) => item.variantId === variantId);
  if (existing) {
    existing.quantity = Math.min(99, existing.quantity + quantity);
  } else {
    state.items.push({ variantId, quantity });
  }
  await writeState(state);
  return buildCart(state);
}

export async function updateCatalogCartItem(
  lineItemId: string,
  quantity: number,
): Promise<Cart> {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    throw new Error("Invalid quantity");
  }
  const state = (await readState()) ?? emptyState();
  const item = state.items.find((entry) => entry.variantId === lineItemId);
  if (!item) throw new Error("Cart item not found");
  item.quantity = quantity;
  await writeState(state);
  return buildCart(state);
}

export async function removeCatalogCartItem(lineItemId: string): Promise<Cart> {
  const state = (await readState()) ?? emptyState();
  state.items = state.items.filter((entry) => entry.variantId !== lineItemId);
  await writeState(state);
  return buildCart(state);
}
