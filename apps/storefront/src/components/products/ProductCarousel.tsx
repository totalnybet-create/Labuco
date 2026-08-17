"use client";

import type { Product } from "@spree/sdk";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import { useCallback, useRef, useState } from "react";
import type Swiper from "swiper";
import { Navigation } from "swiper/modules";
import { Swiper as SwiperComponent, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import { ProductCard } from "@/components/products/ProductCard";

interface ProductCarouselProps {
  products: Product[];
  basePath: string;
  /** Optional currency used for analytics in each ProductCard. */
  currency?: string;
  showQuickAdd?: boolean;
  compact?: boolean;
  appearance?: "default" | "labuco";
}

const NAV_BUTTON_BASE =
  "absolute top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center cursor-pointer rounded-lg bg-white border border-gray-300 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors";

export function ProductCarousel({
  products,
  basePath,
  currency,
  showQuickAdd = false,
  compact = false,
  appearance = "default",
}: ProductCarouselProps): ReactElement {
  const t = useTranslations("products");
  const [isBeginning, setIsBeginning] = useState(true);
  const [isEnd, setIsEnd] = useState(false);

  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  const handleBeforeInit = useCallback((swiper: Swiper) => {
    if (typeof swiper.params.navigation === "object") {
      swiper.params.navigation.prevEl = prevRef.current;
      swiper.params.navigation.nextEl = nextRef.current;
    }
  }, []);

  const updateNavState = useCallback((swiper: Swiper) => {
    setIsBeginning(swiper.isBeginning);
    setIsEnd(swiper.isEnd);
  }, []);

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{t("noProductsFound")}</p>
      </div>
    );
  }

  const breakpoints = compact
    ? {
        640: { slidesPerView: 3, spaceBetween: 14 },
        768: { slidesPerView: 4, spaceBetween: 16 },
        1024: { slidesPerView: 5, spaceBetween: 18 },
      }
    : {
        640: { slidesPerView: 2, spaceBetween: 24 },
        768: { slidesPerView: 3, spaceBetween: 24 },
        1024: { slidesPerView: 4, spaceBetween: 24 },
      };
  const prevEdgeClass = appearance === "labuco" ? "left-0 sm:-left-5" : "-left-5";
  const nextEdgeClass = appearance === "labuco" ? "right-0 sm:-right-5" : "-right-5";

  return (
    <div className="relative">
      <button
        ref={prevRef}
        type="button"
        aria-label={t("carouselPrev")}
        disabled={isBeginning}
        className={`${NAV_BUTTON_BASE} ${prevEdgeClass} ${isBeginning ? "opacity-0" : ""}`}
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        ref={nextRef}
        type="button"
        aria-label={t("carouselNext")}
        disabled={isEnd}
        className={`${NAV_BUTTON_BASE} ${nextEdgeClass} ${isEnd ? "opacity-0" : ""}`}
      >
        <ChevronRight className="w-5 h-5" />
      </button>
      <SwiperComponent
        modules={[Navigation]}
        spaceBetween={compact ? 10 : 24}
        slidesPerView={compact ? 2 : 1}
        navigation={{
          prevEl: prevRef.current,
          nextEl: nextRef.current,
        }}
        onBeforeInit={handleBeforeInit}
        onSlideChange={updateNavState}
        onReachBeginning={updateNavState}
        onReachEnd={updateNavState}
        onAfterInit={updateNavState}
        breakpoints={breakpoints}
        className="product-carousel"
      >
        {products.map((product, index) => (
          <SwiperSlide key={product.id} className="p-1">
            <ProductCard
              product={product}
              basePath={basePath}
              index={index}
              listId="featured-products"
              listName="Featured Products"
              currency={currency}
              fetchPriority={index === 0 ? "high" : undefined}
              showQuickAdd={showQuickAdd}
              appearance={appearance}
            />
          </SwiperSlide>
        ))}
      </SwiperComponent>
    </div>
  );
}
