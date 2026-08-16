"use server";

import type { Cart, CreateCartParams } from "@spree/sdk";
import { updateTag } from "next/cache";
import {
  addCatalogCartItem,
  clearCatalogCart,
  getCatalogCart,
  getOrCreateCatalogCart,
  removeCatalogCartItem,
  updateCatalogCartItem,
} from "@/lib/commerce/catalog-cart";
import { isCatalogCommerce } from "@/lib/commerce/config";
import {
  cacheTagSuffix,
  clearCartCookies,
  DEFAULT_SURFACE,
  getAccessToken,
  getCartId,
  getCartOptions,
  getCartToken,
  getClientForSurface,
  getLocaleOptions,
  isPoisonedDtcCartId,
  requireCartId,
  type Surface,
  setCartCookies,
} from "@/lib/spree";
import { actionResult } from "./utils";

function cartTag(surface: Surface): string {
  return `cart${cacheTagSuffix(surface)}`;
}

function usesCatalogCart(surface: Surface): boolean {
  return surface === "dtc" && isCatalogCommerce();
}

async function cartBelongsToSurface(
  cart: Cart,
  surface: Surface,
): Promise<boolean> {
  if (!cart.channel_id) return true;

  try {
    const channel = await getClientForSurface(surface).channel.get();
    return channel.id === cart.channel_id;
  } catch {
    return true;
  }
}

export async function getCart(
  explicitCartId?: string,
  surface: Surface = DEFAULT_SURFACE,
): Promise<Cart | null> {
  if (usesCatalogCart(surface)) return getCatalogCart();

  const spreeToken = await getCartToken(surface);
  const token = await getAccessToken();
  const cartId = explicitCartId ?? (await getCartId(surface));
  const client = getClientForSurface(surface);

  if (!cartId && !token) return null;

  try {
    if (cartId) {
      if (!explicitCartId && (await isPoisonedDtcCartId(cartId, surface))) {
        await dropSurfaceCartCookies(surface);
        return null;
      }

      const cart = await client.carts.get(cartId, { spreeToken, token });

      if (!explicitCartId && !(await cartBelongsToSurface(cart, surface))) {
        await dropSurfaceCartCookies(surface);
        return null;
      }

      return cart;
    }

    if (token) {
      const response = await client.carts.list({ token });
      if (response.data.length > 0) {
        const cart = response.data[0];
        if (!(await cartBelongsToSurface(cart, surface))) return null;
        await setCartCookies(cart.id, cart.token, surface);
        return cart;
      }
    }

    return null;
  } catch {
    if (!explicitCartId) {
      await dropSurfaceCartCookies(surface);
    }
    return null;
  }
}

async function dropSurfaceCartCookies(surface: Surface): Promise<void> {
  try {
    await clearCartCookies(surface);
  } catch {
    // Cookie clearing is best-effort during Server Component renders.
  }
}

export async function getOrCreateCart(
  params?: CreateCartParams,
  surface: Surface = DEFAULT_SURFACE,
): Promise<Cart> {
  if (usesCatalogCart(surface)) return getOrCreateCatalogCart();

  const existing = await getCart(undefined, surface);
  if (existing) return existing;

  const token = await getAccessToken();
  const localeOptions = await getLocaleOptions();
  const cartParams =
    params && Object.keys(params).length > 0 ? params : undefined;
  const cart = await getClientForSurface(surface).carts.create(cartParams, {
    ...localeOptions,
    ...(token ? { token } : undefined),
  });

  await setCartCookies(cart.id, cart.token, surface);

  updateTag(cartTag(surface));
  return cart;
}

export async function clearCart(surface: Surface = DEFAULT_SURFACE) {
  return actionResult(async () => {
    if (usesCatalogCart(surface)) {
      await clearCatalogCart();
      return {};
    }

    await clearCartCookies(surface);
    updateTag(cartTag(surface));
    return {};
  }, "Failed to clear cart");
}

export async function addToCart(
  variantId: string,
  quantity: number,
  surface: Surface = DEFAULT_SURFACE,
) {
  return actionResult(async () => {
    if (usesCatalogCart(surface)) {
      return { cart: await addCatalogCartItem(variantId, quantity) };
    }

    const cart = await getOrCreateCart(undefined, surface);
    const spreeToken = await getCartToken(surface);
    const token = await getAccessToken();

    const updatedCart = await getClientForSurface(surface).carts.items.create(
      cart.id,
      { variant_id: variantId, quantity },
      { spreeToken, token },
    );

    updateTag(cartTag(surface));
    return { cart: updatedCart };
  }, "Failed to add item to cart");
}

export async function updateCartItem(
  lineItemId: string,
  quantity: number,
  surface: Surface = DEFAULT_SURFACE,
) {
  return actionResult(async () => {
    if (usesCatalogCart(surface)) {
      return { cart: await updateCatalogCartItem(lineItemId, quantity) };
    }

    const options = await getCartOptions(surface);
    const cartId = await requireCartId(surface);

    const cart = await getClientForSurface(surface).carts.items.update(
      cartId,
      lineItemId,
      { quantity },
      options,
    );

    updateTag(cartTag(surface));
    return { cart };
  }, "Failed to update cart item");
}

export async function removeCartItem(
  lineItemId: string,
  surface: Surface = DEFAULT_SURFACE,
) {
  return actionResult(async () => {
    if (usesCatalogCart(surface)) {
      return { cart: await removeCatalogCartItem(lineItemId) };
    }

    const options = await getCartOptions(surface);
    const cartId = await requireCartId(surface);

    const cart = await getClientForSurface(surface).carts.items.delete(
      cartId,
      lineItemId,
      options,
    );

    updateTag(cartTag(surface));
    return { cart };
  }, "Failed to remove cart item");
}

export async function associateCartWithUser(
  surface: Surface = DEFAULT_SURFACE,
) {
  return actionResult(async () => {
    if (usesCatalogCart(surface)) return {};

    const spreeToken = await getCartToken(surface);
    const token = await getAccessToken();
    const cartId = await getCartId(surface);
    if (!cartId || !token) return {};

    try {
      await getClientForSurface(surface).carts.associate(cartId, {
        spreeToken,
        token,
      });
      updateTag(cartTag(surface));
    } catch {
      await clearCartCookies(surface);
      updateTag(cartTag(surface));
    }
    return {};
  }, "Failed to associate cart");
}
