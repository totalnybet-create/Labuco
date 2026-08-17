import {
  ArrowRight,
  Award,
  ShieldCheck,
  Sprout,
  Users,
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
  { label: "Oświetlenie", query: "oświetlenie" },
  { label: "Wentylacja", query: "wentylacja" },
  { label: "Nawozy i stymulatory", query: "nawozy" },
  { label: "Namioty uprawowe", query: "namiot" },
  { label: "Nasiona", query: "nasiona" },
  { label: "Akcesoria", query: "akcesoria" },
  { label: "Filtry i węgle", query: "filtr" },
  { label: "Pomiary i kontrola", query: "miernik" },
] as const;

const trustItems = [
  {
    title: "Dyskrecja przede wszystkim",
    copy: "Neutralne opakowania i brak logotypów",
    Icon: ShieldCheck,
  },
  {
    title: "Wiedza i doświadczenie",
    copy: "Pomagamy w doborze sprzętu i uprawie",
    Icon: Wrench,
  },
  {
    title: "Jakość premium",
    copy: "Tylko sprawdzone produkty renomowanych marek",
    Icon: Award,
  },
  {
    title: "Społeczność Growerów",
    copy: "Wiedza, praktyka i doświadczenie społeczności",
    Icon: Users,
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
    <div className="labuco-home labuco-target-home" data-visual-baseline="designed">
      <section className="labuco-hero labuco-target-hero" aria-labelledby="labuco-home-title">
        <div className="labuco-hero-visual" aria-hidden="true">
          <Image
            src="/labuco/reference-hero.jpg"
            alt=""
            fill
            priority
            sizes="(max-width: 767px) 58vw, 64vw"
            className="labuco-hero-image"
          />
          <img
            src="/labuco/hero-mobile.svg"
            alt=""
            className="absolute inset-0 h-full w-full object-cover md:hidden"
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
              hodowców.
            </p>
            <div className="labuco-hero-benefits">
              <span>
                <ShieldCheck aria-hidden="true" />
                <b>Dyskretna wysyłka</b>
                <small>100% anonimowości</small>
              </span>
              <span>
                <Sprout aria-hidden="true" />
                <b>Szybka dostawa</b>
                <small>1–2 dni robocze</small>
              </span>
              <span>
                <ShieldCheck aria-hidden="true" />
                <b>Bezpieczne płatności</b>
                <small>SSL i zaufane metody</small>
              </span>
            </div>
            <div className="labuco-hero-actions">
              <Link className="labuco-primary-cta" href={`${basePath}/products`}>
                Zobacz produkty <ArrowRight aria-hidden="true" />
              </Link>
              <Link className="labuco-secondary-cta" href={`${basePath}/poradniki`}>
                Poradniki uprawy <ArrowRight aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="labuco-section labuco-target-categories" aria-labelledby="popular-categories">
        <div className="labuco-shell">
          <div className="labuco-section-heading">
            <h2 id="popular-categories">Popularne kategorie</h2>
            <Link href={`${basePath}/products`}>
              Zobacz wszystkie <ArrowRight aria-hidden="true" />
            </Link>
          </div>
          <div className="labuco-category-grid">
            {categories.map(({ label, query }, index) => (
              <Link
                key={label}
                className="labuco-category-card"
                href={`${basePath}/products?q=${encodeURIComponent(query)}`}
              >
                <span
                  className={`labuco-category-photo labuco-category-photo-${index + 1}`}
                  style={{
                    backgroundImage: 'url("/labuco/categories-clean.svg")',
                    backgroundSize: "400% 200%",
                  }}
                  aria-hidden="true"
                />
                <span className="labuco-category-label">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="labuco-section labuco-target-bestsellers" aria-labelledby="bestsellers">
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
            compact
            appearance="labuco"
          />
        </div>
      </section>

      <section className="labuco-trust-strip labuco-target-trust" aria-label="Dlaczego Labuco">
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

      <section className="labuco-section labuco-target-guides" aria-labelledby="guides">
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
                  sizes="(max-width: 767px) 25vw, 25vw"
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
              <p>Zapisz się i otrzymuj promocje, porady oraz nowości.</p>
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
