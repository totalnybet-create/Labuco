import { ArrowRight, BookOpen } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { guides } from "@/lib/content/guides";

interface GuidesPageProps {
  params: Promise<{ country: string; locale: string }>;
}

export const metadata: Metadata = {
  title: "Poradniki uprawy indoor | Labuco",
  description:
    "Praktyczna wiedza o oświetleniu, wentylacji, nawożeniu i kontroli warunków w uprawie indoor.",
};

export default async function GuidesPage({ params }: GuidesPageProps) {
  const { country, locale } = await params;
  const basePath = `/${country}/${locale}`;

  return (
    <div className="labuco-content-page">
      <div className="labuco-content-hero">
        <BookOpen aria-hidden="true" />
        <p>BAZA WIEDZY LABUCO</p>
        <h1>Poradniki uprawy indoor</h1>
        <span>
          Konkretne wskazówki, które pomagają dobrać sprzęt i utrzymać stabilne
          warunki.
        </span>
      </div>

      <div className="labuco-content-grid">
        {guides.map((guide) => (
          <Link
            key={guide.slug}
            href={`${basePath}/guides/${guide.slug}`}
            className="labuco-content-card"
          >
            <span>{guide.kicker}</span>
            <h2>{guide.title}</h2>
            <p>{guide.description}</p>
            <small>{guide.readTime}</small>
            <b>
              Czytaj poradnik <ArrowRight aria-hidden="true" />
            </b>
          </Link>
        ))}
      </div>
    </div>
  );
}
