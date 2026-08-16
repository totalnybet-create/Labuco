import {
  Award,
  BookOpen,
  Fan,
  Filter,
  FlaskConical,
  Gauge,
  Lightbulb,
  Package,
  Scissors,
  ShieldCheck,
  Sprout,
  Users,
} from "lucide-react";
import Link from "next/link";
import { NewsletterForm } from "@/components/home/NewsletterForm";

interface SectionProps {
  basePath: string;
}

const categories = [
  { label: "Oświetlenie", icon: Lightbulb, query: "oswietlenie" },
  { label: "Wentylacja", icon: Fan, query: "wentylacja" },
  { label: "Nawozy i stymulatory", icon: FlaskConical, query: "nawozy" },
  { label: "Namioty uprawowe", icon: Package, query: "namioty" },
  { label: "Nasiona", icon: Sprout, query: "nasiona" },
  { label: "Akcesoria", icon: Scissors, query: "akcesoria" },
  { label: "Filtry i węgle", icon: Filter, query: "filtry" },
  { label: "Pomiary i kontrola", icon: Gauge, query: "pomiary" },
] as const;

const guides = [
  {
    kicker: "PODSTAWY",
    title: "Jak zacząć uprawę indoor?",
    slug: "jak-zaczac-uprawe-indoor",
    icon: Sprout,
  },
  {
    kicker: "OŚWIETLENIE",
    title: "Jak dobrać oświetlenie do namiotu?",
    slug: "jak-dobrac-oswietlenie-do-namiotu",
    icon: Lightbulb,
  },
  {
    kicker: "NAWOŻENIE",
    title: "Nawożenie roślin — poradnik",
    slug: "nawozenie-roslin-poradnik",
    icon: FlaskConical,
  },
  {
    kicker: "PROBLEMY",
    title: "Najczęstsze problemy w uprawie",
    slug: "najczestsze-problemy-w-uprawie",
    icon: BookOpen,
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
        {categories.map(({ label, icon: Icon, query }) => (
          <Link
            key={label}
            href={`${basePath}/products?q=${encodeURIComponent(query)}`}
            className="labuco-category-card"
          >
            <span className="labuco-category-visual" aria-hidden="true">
              <Icon strokeWidth={1.55} />
            </span>
            <span>{label}</span>
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
      className="labuco-trust-strip max-md:[&_.labuco-trust-title]:text-[10.5px] max-md:[&_.labuco-trust-title]:leading-[1.2] max-md:[&_.labuco-trust-copy]:text-[8.5px] max-md:[&_.labuco-trust-copy]:leading-[1.35]"
      aria-label="Dlaczego LaBuco"
    >
      {items.map(({ title, copy, icon: Icon }) => (
        <div className="labuco-trust-item" key={title}>
          <Icon aria-hidden="true" />
          <div>
            <strong className="labuco-trust-title">{title}</strong>
            <p className="labuco-trust-copy">{copy}</p>
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
      className="labuco-section"
      aria-labelledby="knowledge-heading"
    >
      <div className="labuco-section-heading">
        <h2 id="knowledge-heading">Poradniki i wiedza</h2>
        <Link href={`${basePath}/poradniki`} className="labuco-view-all">
          Zobacz wszystkie <span aria-hidden="true">→</span>
        </Link>
      </div>

      <div className="labuco-guide-grid">
        {guides.map(({ kicker, title, slug, icon: Icon }) => (
          <Link
            href={`${basePath}/poradniki/${slug}`}
            className="labuco-guide-card"
            key={title}
          >
            <div className="labuco-guide-art" aria-hidden="true">
              <Icon />
            </div>
            <div className="labuco-guide-copy">
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
      <div className="labuco-newsletter-art" aria-hidden="true">
        <Sprout />
      </div>
    </section>
  );
}
