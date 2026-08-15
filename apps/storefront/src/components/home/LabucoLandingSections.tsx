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
import { NewsletterSignup } from "@/components/home/NewsletterSignup";
import { guides } from "@/lib/content/guides";

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

const guideIcons = [Sprout, Lightbulb, FlaskConical, BookOpen] as const;

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
      copy: "Neutralne opakowania i bez logotypów sklepu.",
      icon: ShieldCheck,
    },
    {
      title: "Wiedza i doświadczenie",
      copy: "Pomagamy w doborze sprzętu i w uprawie.",
      icon: Award,
    },
    {
      title: "Jakość premium",
      copy: "Tylko sprawdzone produkty od renomowanych marek.",
      icon: Sprout,
    },
    {
      title: "Społeczność growerów",
      copy: "Dołącz do naszej społeczności i dziel się doświadczeniem.",
      icon: Users,
    },
  ] as const;

  return (
    <section className="labuco-trust-strip" aria-label="Dlaczego LaBuco">
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
    <section className="labuco-section" aria-labelledby="knowledge-heading">
      <div className="labuco-section-heading">
        <h2 id="knowledge-heading">Poradniki i wiedza</h2>
        <Link href={`${basePath}/guides`} className="labuco-view-all">
          Zobacz wszystkie <span aria-hidden="true">→</span>
        </Link>
      </div>

      <div className="labuco-guide-grid">
        {guides.map(({ kicker, title, slug }, index) => {
          const Icon = guideIcons[index] ?? BookOpen;
          return (
            <Link
              href={`${basePath}/guides/${slug}`}
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
          );
        })}
      </div>
    </section>
  );
}

export function NewsletterSection() {
  return (
    <section className="labuco-newsletter" id="contact">
      <div className="labuco-newsletter-icon" aria-hidden="true">
        <Sprout />
      </div>
      <div className="labuco-newsletter-copy">
        <h2>Bądź zawsze na bieżąco</h2>
        <p>Zapisz się i otrzymuj promocje, porady oraz nowości.</p>
        <NewsletterSignup />
      </div>
      <div className="labuco-newsletter-art" aria-hidden="true">
        <Sprout />
      </div>
    </section>
  );
}
