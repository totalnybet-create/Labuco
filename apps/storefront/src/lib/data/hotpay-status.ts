"use server";

import { getCart } from "@/lib/data/cart";
import { resolveSurfaceForCartVerified } from "@/lib/data/checkout";
import { getOrder } from "@/lib/data/orders";

export type HotPayReturnStatus =
  | { status: "completed"; order: unknown }
  | { status: "pending" }
  | { status: "error" };

/**
 * A browser return from HotPay is never treated as proof of payment.
 * This action only checks whether the signed provider notification has already
 * completed the cart/order on the backend.
 */
export async function getHotPayReturnStatus(
  cartId: string,
): Promise<HotPayReturnStatus> {
  const surface = await resolveSurfaceForCartVerified(cartId);
  if (surface === "unverified") return { status: "error" };

  const cart = await getCart(cartId, surface).catch(() => null);
  if (cart?.current_step === "complete") {
    return { status: "completed", order: cart };
  }

  if (!cart) {
    const order = await getOrder(cartId, undefined, surface).catch(() => null);
    if (order) return { status: "completed", order };
  }

  return { status: "pending" };
}
