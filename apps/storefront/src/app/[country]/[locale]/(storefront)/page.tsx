import type { Metadata } from "next";
import { FeaturedProductsSection } from "@/components/home/FeaturedProductsSection";
import { HeroSection } from "@/components/home/HeroSection";
import {
  KnowledgeSection,
  NewsletterSection,
  PopularCategoriesSection,
  TrustStrip,
} from "@/components/home/LabucoLandingSections";
import { resolveCurrency } from "@/lib/data/markets";
import { generateHomeMetadata } from "@/lib/metadata/home";

interface HomePageProps {
  params: Promise<{
    country: string;
    locale: string;
  }>;
}

export async function generateMetadata({
  params,
}: HomePageProps): Promise<Metadata> {
  const { country, locale } = await params;
  return generateHomeMetadata({ country, locale });
}

export default async function HomePage({ params }: HomePageProps) {
  const { country, locale } = await params;
  const basePath = `/${country}/${locale}`;
  const currency = await resolveCurrency(country);

  return (
    <div className="labuco-home">
      <HeroSection basePath={basePath} locale={locale} />
      <PopularCategoriesSection basePath={basePath} />
      <FeaturedProductsSection
        basePath={basePath}
        locale={locale}
        country={country}
        currency={currency}
      />
      <TrustStrip />
      <KnowledgeSection basePath={basePath} />
      <NewsletterSection />
    </div>
  );
}
