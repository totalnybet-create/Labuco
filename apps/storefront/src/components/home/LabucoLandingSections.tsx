import { Award, ShieldCheck, Sprout, Users } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { NewsletterForm } from "@/components/home/NewsletterForm";

interface SectionProps {
  basePath: string;
}

const REFERENCE_SPRITE = "/images/pufpuf/reference-sprite.webp";

const spriteStyle = (position: string): CSSProperties => ({
  backgroundImage: `url("${REFERENCE_SPRITE}")`,
  backgroundSize: "400% 400%",
  backgroundPosition: position,
  backgroundRepeat: "no-repeat",
});

const categories = [
  { label: "Oświetlenie", query: "oswietlenie", spritePosition: "0% 0%" },
  { label: "Wentylacja", query: "wentylacja", spritePosition: "33.333% 0%" },
  {
    label: "Nawozy i stymulatory",
    query: "nawozy",
    spritePosition: "66.667% 0%",
  },
  { label: "Namioty uprawowe", query: "namioty", spritePosition: "100% 0%" },
  { label: "Nasiona", query: "nasiona", spritePosition: "0% 33.333%" },
  { label: "Akcesoria", query: "akcesoria", spritePosition: "33.333% 33.333%" },
  { label: "Filtry i węgle", query: "filtr", spritePosition: "66.667% 33.333%" },
  {
    label: "Pomiary i kontrola",
    query: "pomiary",
    spritePosition: "100% 33.333%",
  },
] as const;

const guides = [
  {
    kicker: "PODSTAWY",
    title: "Jak zacząć uprawę indoor?",
    slug: "jak-zaczac-uprawe-indoor",
    spritePosition: "0% 66.667%",
  },
  {
    kicker: "OŚWIETLENIE",
    title: "Jak dobrać oświetlenie do namiotu?",
    slug: "jak-dobrac-oswietlenie-do-namiotu",
    spritePosition: "33.333% 66.667%",
  },
  {
    kicker: "NAWOŻENIE",
    title: "Nawożenie roślin — poradnik",
    slug: "nawozenie-roslin-poradnik",
    spritePosition: "66.667% 66.667%",
  },
  {
    kicker: "PROBLEMY",
    title: "Najczęstsze problemy w uprawie",
    slug: "najczestsze-problemy-w-uprawie",
    spritePosition: "100% 66.667%",
  },
] as const;

export function PopularCategoriesSection({ basePath }: SectionProps) {
  return (
    <section className="labuco-section" aria-labelledby="popular-categories">
      <div className="labuco-section-heading">
        <h2 id="popular-categories">Popularne kategorie</h2>
        <Link href={`${basePath}/products`} className="labuco-view-all">
          Zobacz wszystkie <span aria-hidden="true">→</span>
        </Link>
      </div>

      <div className="labuco-category-grid">
        {categories.map(({ label, query, spritePosition }) => (
          <Link
            key={label}
            href={`${basePath}/products?q=${encodeURIComponent(query)}`}
            className="labuco-category-card !min-h-[70px] md:!min-h-[148px]"
          >
            <span
              className="labuco-category-visual !min-h-[46px] md:!min-h-[110px]"
              style={spriteStyle(spritePosition)}
              aria-hidden="true"
            />
            <span className="!text-[7px] md:!text-[12px]">{label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function TrustStrip() {
  const items = [
    {
      title: "Dyskrecja przede wszystkim",
      copy: "Neutralne opakowania i bez zbędnych oznaczeń.",
      icon: ShieldCheck,
    },
    {
      title: "Wiedza i doświadczenie",
      copy: "Pomagamy w doborze sprzętu i akcesoriów.",
      icon: Award,
    },
    {
      title: "Jakość premium",
      copy: "Sprawdzone produkty od renomowanych marek.",
      icon: Sprout,
    },
    {
      title: "Społeczność growerów",
      copy: "Poradniki, wiedza i praktyczne wskazówki.",
      icon: Users,
    },
  ] as const;

  return (
    <section
      className="labuco-trust-strip !mt-[9px] !mb-[4px] !pt-[14px] !pb-[13px] md:!mt-[18px] md:!mb-[4px] md:!py-[13px]"
      aria-label="Dlaczego pufpuf.shop"
    >
      {items.map(({ title, copy, icon: Icon }) => (
        <div className="labuco-trust-item" key={title}>
          <Icon aria-hidden="true" />
          <div>
            <strong>{title}</strong>
            <p>{copy}</p>
          </div>
        </div>
      ))}
    </section>
  );
}

export function KnowledgeSection({ basePath }: SectionProps) {
  return (
    <section
      id="poradniki"
      className="labuco-section !pt-[11px] md:!pt-[22px]"
      aria-labelledby="knowledge-heading"
    >
      <div className="labuco-section-heading">
        <h2 id="knowledge-heading">Poradniki i wiedza</h2>
        <Link href={`${basePath}/poradniki`} className="labuco-view-all">
          Zobacz wszystkie <span aria-hidden="true">→</span>
        </Link>
      </div>

      <div className="labuco-guide-grid">
        {guides.map(({ kicker, title, slug, spritePosition }) => (
          <Link
            href={`${basePath}/poradniki/${slug}`}
            className="labuco-guide-card"
            key={title}
          >
            <div
              className="labuco-guide-art !h-[36px] md:!h-[132px]"
              style={spriteStyle(spritePosition)}
              aria-hidden="true"
            />
            <div className="labuco-guide-copy !min-h-[31px] md:!min-h-[62px]">
              <span>{kicker}</span>
              <h3>{title}</h3>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function NewsletterSection() {
  return (
    <section className="labuco-newsletter">
      <div className="labuco-newsletter-icon" aria-hidden="true">
        <Sprout />
      </div>
      <div className="labuco-newsletter-copy">
        <h2>Bądź zawsze na bieżąco</h2>
        <p>
          Zapisz się i otrzymuj informacje o promocjach, poradach oraz
          nowościach.
        </p>
        <NewsletterForm />
      </div>
      <div
        className="labuco-newsletter-art"
        style={spriteStyle("0% 100%")}
        aria-hidden="true"
      />
    </section>
  );
}
