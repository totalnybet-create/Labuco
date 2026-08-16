"use client";

import type { Product } from "@spree/sdk";
import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { memo } from "react";
import { FavoriteButton } from "@/components/products/FavoriteButton";
import { HiddenPricePrompt } from "@/components/products/HiddenPricePrompt";
import { ProductImage } from "@/components/ui/product-image";
import { useCart } from "@/contexts/CartContext";
import { trackSelectItem } from "@/lib/analytics/gtm";

interface ProductCardProps {
  product: Product;
  basePath?: string;
  categoryId?: string;
  index?: number;
  listId?: string;
  listName?: string;
  fetchPriority?: "high" | "low" | "auto";
  currency?: string;
  showQuickAdd?: boolean;
  appearance?: "default" | "labuco";
}

interface QuickAddButtonProps {
  product: Product;
}

function QuickAddButton({ product }: QuickAddButtonProps) {
  const { addItem, updating } = useCart();
  const variantId = product.default_variant_id;

  if (!variantId || !product.purchasable) return null;

  const handleQuickAdd = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (updating) return;
    await addItem(variantId, 1);
  };

  return (
    <button
      type="button"
      className="labuco-card-cart relative z-10 mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={updating}
      onClick={handleQuickAdd}
      aria-label={`Dodaj ${product.name} do koszyka`}
    >
      <ShoppingCart className="size-4" aria-hidden="true" />
      <span>{updating ? "Dodaję…" : "Do koszyka"}</span>
    </button>
  );
}

export const ProductCard = memo(function ProductCard({
  product,
  basePath = "",
  categoryId,
  index,
  listId,
  listName,
  fetchPriority,
  currency,
  showQuickAdd = false,
  appearance = "default",
}: ProductCardProps) {
  const t = useTranslations("products");
  const imageUrl = product.thumbnail_url || null;
  const displayPrice = product.price?.display_amount;
  const isLabuco = appearance === "labuco";

  const currentAmountCents = product.price?.amount_in_cents;
  const originalAmountCents = product.original_price?.amount_in_cents;
  const compareAtAmountCents = product.price?.compare_at_amount_in_cents;
  const onSale =
    (currentAmountCents != null &&
      originalAmountCents != null &&
      currentAmountCents < originalAmountCents) ||
    (compareAtAmountCents != null &&
      currentAmountCents != null &&
      currentAmountCents < compareAtAmountCents);

  const strikethroughPrice = onSale
    ? ((product.original_price?.display_amount &&
      product.original_price.display_amount !== displayPrice
        ? product.original_price.display_amount
        : product.price?.display_compare_at_amount) ?? null)
    : null;

  const handleClick = () => {
    if (index != null && listId && listName && currency) {
      trackSelectItem(product, listId, listName, index, currency);
    }
  };

  return (
    <div
      className={
        isLabuco
          ? "group relative h-full overflow-hidden rounded-xl border border-white/10 bg-[#0b2118] shadow-sm"
          : "group relative"
      }
    >
      <div
        className={
          isLabuco
            ? "relative aspect-square overflow-hidden bg-[#eef2ec]"
            : "relative aspect-square bg-gray-100 rounded-md overflow-hidden"
        }
      >
        <ProductImage
          src={imageUrl}
          alt={product.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 300px"
          iconClassName="w-16 h-16"
          fetchPriority={fetchPriority}
        />
        <FavoriteButton
          product={product}
          className="absolute right-2 top-2 z-20"
        />
        {onSale && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-medium px-2 py-1 rounded">
            {t("sale")}
          </span>
        )}
      </div>

      <div className={isLabuco ? "p-3 sm:p-4" : "p-4"}>
        <h3
          className={
            isLabuco
              ? "line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-white transition-colors group-hover:text-[#c0dd62]"
              : "text-sm font-medium text-gray-900 group-hover:text-primary transition-colors line-clamp-2"
          }
        >
          <Link
            href={`${basePath}/products/${product.slug}${categoryId ? `?category_id=${categoryId}` : ""}`}
            className="after:absolute after:inset-0"
            onClick={handleClick}
          >
            {product.name}
          </Link>
        </h3>

        <div className="mt-2 flex items-center gap-2">
          {displayPrice ? (
            <span
              className={
                isLabuco
                  ? "text-base font-bold text-white sm:text-lg"
                  : "text-lg font-semibold text-gray-900"
              }
            >
              {displayPrice}
            </span>
          ) : (
            <HiddenPricePrompt />
          )}
          {onSale && strikethroughPrice && (
            <span
              className={
                isLabuco
                  ? "text-xs text-white/55 line-through sm:text-sm"
                  : "text-sm text-gray-500 line-through"
              }
            >
              {strikethroughPrice}
            </span>
          )}
        </div>

        {!product.purchasable && (
          <span
            className={
              isLabuco
                ? "mt-2 block text-xs text-white/55 sm:text-sm"
                : "mt-2 text-sm text-gray-500"
            }
          >
            {t("outOfStock")}
          </span>
        )}

        {showQuickAdd && <QuickAddButton product={product} />}
      </div>
    </div>
  );
});
