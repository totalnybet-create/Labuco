import { ArrowRight, BookOpen } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { GUIDE_ARTICLES } from "@/lib/content/guides";

interface GuidesPageProps {
  params: Promise<{ country: string; locale: string }>;
}

export const metadata: Metadata = {
  title: "Poradniki i wiedza | Labuco",
  description:
    "Praktyczne poradniki Labuco dotyczące organizacji legalnej uprawy indoor, oświetlenia, nawożenia i diagnostyki stanowiska.",
};

export default async function GuidesPage({ params }: GuidesPageProps) {
  const { country, locale } = await params;
  const basePath = `/${country}/${locale}`;

  return (
    <div className="container mx-auto px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="max-w-3xl">
        <div className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-primary">
          <BookOpen className="size-4" aria-hidden="true" />
          Labuco · wiedza
        </div>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-gray-950">
          Poradniki i wiedza
        </h1>
        <p className="mt-4 text-lg leading-8 text-gray-600">
          Konkretne materiały pomagające dobrać sprzęt i uporządkować stanowisko
          indoor bez zgadywania i przypadkowych zakupów.
        </p>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {GUIDE_ARTICLES.map((guide) => (
          <Link
            key={guide.slug}
            href={`${basePath}/poradniki/${guide.slug}`}
            className="group rounded-2xl border border-gray-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm"
          >
            <span className="text-xs font-bold tracking-[0.16em] text-primary">
              {guide.kicker}
            </span>
            <h2 className="mt-3 text-xl font-semibold text-gray-950">
              {guide.title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-gray-600">
              {guide.excerpt}
            </p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-gray-900">
              Czytaj poradnik
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
