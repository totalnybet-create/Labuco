import { ArrowLeft, Check, Clock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { findGuide, guides } from "@/lib/content/guides";

interface GuidePageProps {
  params: Promise<{ country: string; locale: string; slug: string }>;
}

export function generateStaticParams() {
  return guides.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: GuidePageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = findGuide(slug);
  if (!guide) return {};
  return {
    title: `${guide.title} | Labuco`,
    description: guide.description,
  };
}

export default async function GuidePage({ params }: GuidePageProps) {
  const { country, locale, slug } = await params;
  const guide = findGuide(slug);
  if (!guide) notFound();
  const basePath = `/${country}/${locale}`;

  return (
    <article className="labuco-article-page">
      <Link href={`${basePath}/guides`} className="labuco-article-back">
        <ArrowLeft aria-hidden="true" /> Wszystkie poradniki
      </Link>

      <header>
        <p>{guide.kicker}</p>
        <h1>{guide.title}</h1>
        <span>{guide.description}</span>
        <small>
          <Clock aria-hidden="true" /> {guide.readTime}
        </small>
      </header>

      <div className="labuco-article-body">
        {guide.sections.map((section) => (
          <section key={section.heading}>
            <h2>{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {section.checklist && (
              <ul>
                {section.checklist.map((item) => (
                  <li key={item}>
                    <Check aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <aside>
        <h2>Potrzebujesz sprzętu?</h2>
        <p>Przejdź do katalogu i porównaj produkty według zastosowania.</p>
        <Link href={`${basePath}/products`}>Zobacz wszystkie produkty</Link>
      </aside>
    </article>
  );
}
