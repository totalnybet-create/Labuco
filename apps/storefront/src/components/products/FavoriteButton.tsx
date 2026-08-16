"use client";

import type { Product } from "@spree/sdk";
import { Heart } from "lucide-react";
import { useEffect, useState } from "react";
import {
  FAVORITES_CHANGED_EVENT,
  hasFavorite,
  toggleFavorite,
} from "@/lib/favorites/storage";

interface FavoriteButtonProps {
  product: Product;
  className?: string;
  showLabel?: boolean;
}

export function FavoriteButton({
  product,
  className = "",
  showLabel = false,
}: FavoriteButtonProps) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const sync = () => setActive(hasFavorite(product.id));
    sync();
    window.addEventListener(FAVORITES_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(FAVORITES_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [product.id]);

  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-full border border-white/70 bg-white/90 p-2.5 text-gray-700 shadow-sm backdrop-blur transition hover:text-primary ${className}`}
      aria-pressed={active}
      aria-label={
        active
          ? `Usuń ${product.name} z ulubionych`
          : `Dodaj ${product.name} do ulubionych`
      }
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        const next = toggleFavorite({
          id: product.id,
          name: product.name,
          slug: product.slug,
          thumbnailUrl: product.thumbnail_url || null,
          displayPrice: product.price?.display_amount || null,
          purchasable: product.purchasable ?? false,
        });
        setActive(next);
      }}
    >
      <Heart
        className="size-5"
        fill={active ? "currentColor" : "none"}
        aria-hidden="true"
      />
      {showLabel && (
        <span>{active ? "W ulubionych" : "Dodaj do ulubionych"}</span>
      )}
    </button>
  );
}
