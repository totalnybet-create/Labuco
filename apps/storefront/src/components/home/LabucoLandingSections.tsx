import { Award, ShieldCheck, Sprout, Users } from "lucide-react";
import Link from "next/link";
import { NewsletterForm } from "@/components/home/NewsletterForm";

interface SectionProps {
  basePath: string;
}

const categories = [
  {
    label: "Oświetlenie",
    query: "oswietlenie",
    image:
      "https://www.growtent.pl/hpeciai/954a5102209f25b90ccbc26ea0ced3f1/pol_pl_Lampa-HPS-Lumatek-Dual-400W-240-Volt-290_1.webp",
  },
  {
    label: "Wentylacja",
    query: "wentylacja",
    image:
      "https://www.growtent.pl/hpeciai/bf4b54f4252bb14161d6db8cf642a1e4/pol_pl_Wentylator-Axial-Flo-100mm-105-m3-h-366_1.webp",
  },
  {
    label: "Nawozy i stymulatory",
    query: "nawozy",
    image:
      "https://www.growtent.pl/hpeciai/9c4edf53d441f8ae0ec1e3e3742a52e7/pol_pl_Growth-Technology-Bloom-300-Growth-300-Micro-300-968_1.webp",
  },
  {
    label: "Namioty uprawowe",
    query: "namioty",
    image:
      "https://www.growtent.pl/hpeciai/fd674b7b5a8ddbde31a2f4169983bdf3/pol_pl_Zestaw-growbox-Secret-Jardin-80x80x180cm-LED-LUMATEK-ATS-200W-PRO-548_2.webp",
  },
  {
    label: "Nasiona",
    query: "nasiona",
    image:
      "https://www.growtent.pl/hpeciai/4065afa50e1fb8202f7fb194e7a8a328/pol_pl_TRENDYGARDEN-Vacuum-Pack-60x40cm-Folia-prozniowa-w-worku-uprawa-i-przechowywanie-3012_1.webp",
  },
  {
    label: "Akcesoria",
    query: "akcesoria",
    image:
      "https://www.growtent.pl/hpeciai/e0578e55f9b809c8e989a98d06023022/pol_pl_Bubble-bags-5-workow-do-ekstrakcji-roslinnej-160L-4286_2.webp",
  },
  {
    label: "Filtry i węgle",
    query: "filtr",
    image:
      "https://www.growtent.pl/hpeciai/0285509788f6c9fdb3f455322b7bf9e0/pol_pl_Filtr-weglowy-Prima-Klima-Eco-Line-100mm-160-240m3-H-306_3.webp",
  },
  {
    label: "Pomiary i kontrola",
    query: "pomiary",
    image:
      "https://www.growtent.pl/hpeciai/0a85459939a5a52000f9361017b1dcab/pol_pl_Miernik-TDS-EC-Adwa-AD31-wodoszczelny-z-wymienna-elektroda-3787_1.webp",
  },
] as const;

const guides = [
  {
    kicker: "PODSTAWY",
    title: "Jak zacząć uprawę indoor?",
    slug: "jak-zaczac-uprawe-indoor",
    image:
      "https://www.growtent.pl/hpeciai/fd674b7b5a8ddbde31a2f4169983bdf3/pol_pl_Zestaw-growbox-Secret-Jardin-80x80x180cm-LED-LUMATEK-ATS-200W-PRO-548_2.webp",
  },
  {
    kicker: "OŚWIETLENIE",
    title: "Jak dobrać oświetlenie do namiotu?",
    slug: "jak-dobrac-oswietlenie-do-namiotu",
    image:
      "https://www.growtent.pl/hpeciai/954a5102209f25b90ccbc26ea0ced3f1/pol_pl_Lampa-HPS-Lumatek-Dual-400W-240-Volt-290_1.webp",
  },
  {
    kicker: "NAWOŻENIE",
    title: "Nawożenie roślin — poradnik",
    slug: "nawozenie-roslin-poradnik",
    image:
      "https://www.growtent.pl/hpeciai/9c4edf53d441f8ae0ec1e3e3742a52e7/pol_pl_Growth-Technology-Bloom-300-Growth-300-Micro-300-968_1.webp",
  },
  {
    kicker: "PROBLEMY",
    title: "Najczęstsze problemy w uprawie",
    slug: "najczestsze-problemy-w-uprawie",
    image:
      "https://www.growtent.pl/hpeciai/0285509788f6c9fdb3f455322b7bf9e0/pol_pl_Filtr-weglowy-Prima-Klima-Eco-Line-100mm-160-240m3-H-306_3.webp",
  },
] as const;

const NEWSLETTER_IMAGE =
  "https://www.growtent.pl/hpeciai/c686f33c598cabd93c080d872285bdcd/pol_pl_Zestaw-Growbox-RoyalRoom-2-0-150x150x200cm-LUCKYGROW-FLEX-LED-720W-2-85-4781_2.webp";

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
        {categories.map(({ label, image, query }) => (
          <Link
            key={label}
            href={`${basePath}/products?q=${encodeURIComponent(query)}`}
            className="labuco-category-card"
          >
            <span
              className="labuco-category-visual"
              style={{ backgroundImage: `url("${image}")` }}
              aria-hidden="true"
            />
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
    <section className="labuco-trust-strip" aria-label="Dlaczego pufpuf.shop">
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
        {guides.map(({ kicker, title, slug, image }) => (
          <Link
            href={`${basePath}/poradniki/${slug}`}
            className="labuco-guide-card"
            key={title}
          >
            <div
              className="labuco-guide-art"
              style={{ backgroundImage: `url("${image}")` }}
              aria-hidden="true"
            />
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
      <div
        className="labuco-newsletter-art"
        style={{ backgroundImage: `url("${NEWSLETTER_IMAGE}")` }}
        aria-hidden="true"
      />
    </section>
  );
}
