import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GUIDE_ARTICLES, getGuideArticle } from "@/lib/content/guides";

interface GuideArticlePageProps {
  params: Promise<{ country: string; locale: string; slug: string }>;
}

export function generateStaticParams() {
  return GUIDE_ARTICLES.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({
  params,
}: GuideArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getGuideArticle(slug);
  if (!article) return {};
  return {
    title: `${article.title} | Labuco`,
    description: article.excerpt,
  };
}

export default async function GuideArticlePage({
  params,
}: GuideArticlePageProps) {
  const { country, locale, slug } = await params;
  const article = getGuideArticle(slug);
  if (!article) notFound();
  const basePath = `/${country}/${locale}`;

  return (
    <article className="container mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <Link
        href={`${basePath}/poradniki`}
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-950"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Wszystkie poradniki
      </Link>

      <header className="mt-8 border-b border-gray-200 pb-8">
        <span className="text-xs font-bold tracking-[0.18em] text-primary">
          {article.kicker}
        </span>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-gray-950 sm:text-5xl">
          {article.title}
        </h1>
        <p className="mt-5 text-lg leading-8 text-gray-600">
          {article.excerpt}
        </p>
      </header>

      <div className="mt-10 space-y-10">
        {article.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-2xl font-semibold text-gray-950">
              {section.heading}
            </h2>
            <div className="mt-4 space-y-4 text-base leading-7 text-gray-700">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            {section.bullets && (
              <ul className="mt-5 list-disc space-y-2 pl-5 text-gray-700 marker:text-primary">
                {section.bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </article>
  );
}
