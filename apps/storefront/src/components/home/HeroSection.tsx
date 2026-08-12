import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { getStoreName } from "@/lib/store";

interface HeroSectionProps {
  basePath: string;
  locale: string;
}

export async function HeroSection({ basePath, locale }: HeroSectionProps) {
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "home",
  });
  const storeName = getStoreName();
  const isPolish = locale === "pl";

  const title = isPolish
    ? "Labuco — sprzęt i akcesoria do uprawy indoor"
    : t("welcome", { storeName });
  const description = isPolish
    ? "Nawozy, oświetlenie, wentylacja, pomiary i akcesoria w jednym miejscu. Przejrzysty katalog, konkurencyjne ceny i szybkie wyszukiwanie po tysiącach produktów."
    : t("heroDescription");

  return (
    <section className="border-b border-gray-200 bg-gradient-to-b from-emerald-50/70 to-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-5 inline-flex rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-emerald-900 shadow-sm">
            {isPolish ? "Ponad 3000 produktów w przygotowaniu" : storeName}
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-gray-950">
            {title}
          </h1>
          <p className="mt-5 text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
            {description}
          </p>
          <div className="mt-9 flex justify-center gap-4 flex-wrap">
            <Button size="lg" asChild>
              <Link href={`${basePath}/products`}>
                {isPolish ? "Przeglądaj produkty" : t("shopNow")}
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href={`${basePath}/products?sort=price`}>
                {isPolish ? "Zobacz ceny" : t("viewAll")}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
