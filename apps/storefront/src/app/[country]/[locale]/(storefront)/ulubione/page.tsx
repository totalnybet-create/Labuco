"use client";

import { Heart, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ProductImage } from "@/components/ui/product-image";
import {
  FAVORITES_CHANGED_EVENT,
  type FavoriteSnapshot,
  readFavorites,
  writeFavorites,
} from "@/lib/favorites/storage";
import { extractBasePath } from "@/lib/utils/path";

export default function FavoritesPage() {
  const pathname = usePathname();
  const basePath = extractBasePath(pathname);
  const [items, setItems] = useState<FavoriteSnapshot[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => {
      setItems(readFavorites());
      setReady(true);
    };
    sync();
    window.addEventListener(FAVORITES_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(FAVORITES_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (!ready) {
    return (
      <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="flex items-center gap-3">
        <Heart className="size-7 text-primary" aria-hidden="true" />
        <h1 className="text-3xl font-bold text-gray-950">Ulubione</h1>
      </div>
      <p className="mt-2 text-gray-600">
        Produkty zapisane na tym urządzeniu. Lista nie zależy od backendu sklepu.
      </p>

      {items.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-gray-300 p-10 text-center">
          <Heart className="mx-auto size-12 text-gray-300" aria-hidden="true" />
          <h2 className="mt-4 text-lg font-semibold text-gray-900">
            Nie masz jeszcze ulubionych produktów
          </h2>
          <Link
            href={`${basePath}/products`}
            className="mt-5 inline-flex rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white"
          >
            Przejdź do produktów
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
          {items.map((item) => (
            <article key={item.id} className="relative rounded-xl border border-gray-200 bg-white p-3">
              <button
                type="button"
                className="absolute right-4 top-4 z-10 rounded-full bg-white/90 p-2 text-gray-600 shadow-sm hover:text-red-600"
                aria-label={`Usuń ${item.name} z ulubionych`}
                onClick={() =>
                  writeFavorites(items.filter((candidate) => candidate.id !== item.id))
                }
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
              <Link href={`${basePath}/products/${item.slug}`}>
                <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
                  <ProductImage
                    src={item.thumbnailUrl}
                    alt={item.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                </div>
                <h2 className="mt-3 line-clamp-2 text-sm font-semibold text-gray-950">
                  {item.name}
                </h2>
                {item.displayPrice && (
                  <p className="mt-2 text-base font-bold text-gray-950">
                    {item.displayPrice}
                  </p>
                )}
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
