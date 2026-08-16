import {
  ArrowRight,
  CreditCard,
  Fan,
  Filter,
  Gauge,
  Headphones,
  Leaf,
  Lightbulb,
  Package,
  ShieldCheck,
  Sprout,
  Truck,
  Wrench,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { NewsletterForm } from "@/components/home/NewsletterForm";
import { FeaturedProducts } from "@/components/products/FeaturedProducts";
import { GUIDE_ARTICLES } from "@/lib/content/guides";
import { resolveCurrency } from "@/lib/data/markets";
import { generateHomeMetadata } from "@/lib/metadata/home";

interface HomePageProps {
  params: Promise<{
    country: string;
    locale: string;
  }>;
}

const categories = [
  { label: "Oświetlenie", query: "oświetlenie", Icon: Lightbulb },
  { label: "Wentylacja", query: "wentylacja", Icon: Fan },
  { label: "Nawozy i stymulatory", query: "nawozy", Icon: Leaf },
  { label: "Namioty uprawowe", query: "namiot", Icon: Package },
  { label: "Nasiona", query: "nasiona", Icon: Sprout },
  { label: "Akcesoria", query: "akcesoria", Icon: Wrench },
  { label: "Filtry i węgle", query: "filtr", Icon: Filter },
  { label: "Pomiary i kontrola", query: "miernik", Icon: Gauge },
] as const;

const trustItems = [
  {
    title: "Dyskretna wysyłka",
    copy: "Bezpieczne pakowanie bez oznaczeń sklepu",
    Icon: ShieldCheck,
  },
  {
    title: "Bezpieczne płatności",
    copy: "Szyfrowane i zaufane metody",
    Icon: CreditCard,
  },
  {
    title: "Szybka dostawa",
    copy: "Sprawna realizacja zamówień",
    Icon: Truck,
  },
  {
    title: "Pomoc ekspertów",
    copy: "Wsparcie przy doborze sprzętu",
    Icon: Headphones,
  },
] as const;

const guidePositions = ["20% 50%", "42% 50%", "64% 50%", "82% 50%"] as const;

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
    <div className="labuco-home" data-visual-baseline="designed">
      <section className="labuco-hero" aria-labelledby="labuco-home-title">
        <div className="labuco-hero-visual" aria-hidden="true">
          <Image
            src="/labuco/reference-hero.jpg"
            alt=""
            fill
            priority
            sizes="(max-width: 767px) 62vw, 58vw"
            className="labuco-hero-image"
          />
        </div>
        <div className="labuco-shell">
          <div className="labuco-hero-content">
            <span className="labuco-hero-eyebrow">
              <Sprout aria-hidden="true" /> Labuco · Grow smart
            </span>
            <h1 id="labuco-home-title">
              Wszystko, czego potrzebujesz
              <span>do udanej uprawy.</span>
            </h1>
            <p className="labuco-hero-copy">
              Profesjonalne produkty dla początkujących i doświadczonych
              hodowców. Sprzęt, który da się dobrać bez zgadywania.
            </p>
            <div className="labuco-hero-benefits">
              <span>
                <ShieldCheck aria-hidden="true" /> Dyskretna wysyłka
              </span>
              <span>
                <Truck aria-hidden="true" /> Szybka dostawa
              </span>
              <span>
                <CreditCard aria-hidden="true" /> Bezpieczne płatności
              </span>
            </div>
            <div className="labuco-hero-actions">
              <Link
                className="labuco-primary-cta"
                href={`${basePath}/products`}
              >
                Zobacz produkty <ArrowRight aria-hidden="true" />
              </Link>
              <Link
                className="labuco-secondary-cta"
                href={`${basePath}/poradniki`}
              >
                Poradniki uprawy <ArrowRight aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="labuco-section" aria-labelledby="popular-categories">
        <div className="labuco-shell">
          <div className="labuco-section-heading">
            <h2 id="popular-categories">Popularne kategorie</h2>
            <Link href={`${basePath}/products`}>
              Zobacz wszystkie <ArrowRight aria-hidden="true" />
            </Link>
          </div>
          <div className="labuco-category-grid">
            {categories.map(({ label, query, Icon }) => (
              <Link
                key={label}
                className="labuco-category-card"
                href={`${basePath}/products?q=${encodeURIComponent(query)}`}
              >
                <Icon aria-hidden="true" />
                <span>{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section
        className="labuco-trust-strip"
        aria-label="Standard obsługi Labuco"
      >
        <div className="labuco-shell labuco-trust-grid">
          {trustItems.map(({ title, copy, Icon }) => (
            <div className="labuco-trust-item" key={title}>
              <span className="labuco-trust-icon">
                <Icon aria-hidden="true" />
              </span>
              <span>
                <strong>{title}</strong>
                <small>{copy}</small>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section
        className="labuco-section labuco-products-section"
        aria-labelledby="bestsellers"
      >
        <div className="labuco-shell">
          <div className="labuco-section-heading">
            <h2 id="bestsellers">Bestsellery</h2>
            <Link href={`${basePath}/products`}>
              Zobacz wszystkie <ArrowRight aria-hidden="true" />
            </Link>
          </div>
          <FeaturedProducts
            basePath={basePath}
            locale={locale}
            country={country}
            currency={currency}
          />
        </div>
      </section>

      <section className="labuco-section" aria-labelledby="guides">
        <div className="labuco-shell">
          <div className="labuco-section-heading">
            <h2 id="guides">Poradniki i wiedza</h2>
            <Link href={`${basePath}/poradniki`}>
              Zobacz wszystkie <ArrowRight aria-hidden="true" />
            </Link>
          </div>
          <div className="labuco-guide-grid">
            {GUIDE_ARTICLES.slice(0, 4).map((guide, index) => (
              <Link
                key={guide.slug}
                className="labuco-guide-card"
                href={`${basePath}/poradniki/${guide.slug}`}
              >
                <Image
                  src="/labuco/reference-guides.jpg"
                  alt=""
                  fill
                  sizes="(max-width: 767px) 50vw, 25vw"
                  style={{ objectPosition: guidePositions[index] }}
                />
                <span className="labuco-guide-copy">
                  <span>{guide.kicker}</span>
                  <strong>{guide.title}</strong>
                </span>
              </Link>
            ))}
          </div>

          <div className="labuco-newsletter">
            <div className="labuco-newsletter-copy">
              <h3>Bądź zawsze na bieżąco</h3>
              <p>Zapisz się i otrzymuj promocje, porady oraz nowości Labuco.</p>
              <NewsletterForm />
            </div>
            <div className="labuco-newsletter-image" aria-hidden="true">
              <Image
                src="/labuco/reference-newsletter.jpg"
                alt=""
                fill
                sizes="(max-width: 767px) 34vw, 38vw"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
