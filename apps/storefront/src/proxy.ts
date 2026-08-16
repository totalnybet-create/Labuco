import { type NextRequest, NextResponse } from "next/server";
import { SUPPORTED_LOCALES } from "@/i18n/locales";
import { isCatalogCommerce } from "@/lib/commerce/config";
import { createSpreeMiddleware } from "@/lib/spree/middleware";
import { getDefaultCountry, getDefaultLocale } from "@/lib/store";

const spreeProxy = createSpreeMiddleware({
  defaultCountry: getDefaultCountry(),
  defaultLocale: getDefaultLocale(),
  supportedLocales: SUPPORTED_LOCALES,
});

const LOCALIZED_PATH =
  /^\/([a-z]{2})\/([a-z]{2,3}(?:-[a-z0-9]{2,8})*)(\/.*)?$/i;

function catalogModeRedirect(request: NextRequest): NextResponse | null {
  if (!isCatalogCommerce()) return null;

  const match = request.nextUrl.pathname.match(LOCALIZED_PATH);
  if (!match) return null;

  const prefix = `/${match[1].toLowerCase()}/${match[2].toLowerCase()}`;
  const rest = (match[3] || "/").replace(/\/+$/, "") || "/";

  const transactionalPath =
    rest === "/checkout" ||
    rest.startsWith("/checkout/") ||
    rest === "/confirm-payment" ||
    rest.startsWith("/confirm-payment/") ||
    rest === "/order-placed" ||
    rest.startsWith("/order-placed/");

  if (transactionalPath) {
    const url = request.nextUrl.clone();
    url.pathname = `${prefix}/cart`;
    url.search = "";
    return NextResponse.redirect(url);
  }

  // The account landing page has a deliberate no-backend state. All deeper
  // account routes require authentication/order data and therefore collapse
  // back to that safe landing page until a transactional provider is enabled.
  if (rest.startsWith("/account/")) {
    const url = request.nextUrl.clone();
    url.pathname = `${prefix}/account`;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return null;
}

export function proxy(request: NextRequest) {
  return catalogModeRedirect(request) ?? spreeProxy(request);
}

export const config = {
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico|.*\\..*$).*)"],
};
