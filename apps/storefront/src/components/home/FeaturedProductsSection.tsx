import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { FeaturedProducts } from "@/components/products/FeaturedProducts";
import { ProductCardSkeleton } from "@/components/products/ProductCardSkeleton";

function CarouselSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 md:gap-5">
      {[...Array(4)].map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

interface FeaturedProductsSectionProps {
  basePath: string;
  locale: string;
  country: string;
  currency?: string;
}

export async function FeaturedProductsSection({
  basePath,
  locale,
  country,
  currency,
}: FeaturedProductsSectionProps) {
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "home",
  });
  const isPolish = locale === "pl";

  return (
    <section className="labuco-section labuco-bestsellers featured-products">
      <div className="labuco-section-heading">
        <h2>{isPolish ? "Bestsellery" : t("featuredProducts")}</h2>
        <Link href={`${basePath}/products`} className="labuco-view-all">
          {isPolish ? "Zobacz wszystkie" : t("viewAll")}{" "}
          <span aria-hidden="true">→</span>
        </Link>
      </div>
      <Suspense fallback={<CarouselSkeleton />}>
        <FeaturedProducts
          basePath={basePath}
          locale={locale}
          country={country}
          currency={currency}
        />
      </Suspense>
    </section>
  );
}
