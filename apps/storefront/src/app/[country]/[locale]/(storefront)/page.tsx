import type { Metadata } from "next";
import { generateHomeMetadata } from "@/lib/metadata/home";

interface HomePageProps {
  params: Promise<{
    country: string;
    locale: string;
  }>;
}

export async function generateMetadata({
  params,
}: HomePageProps): Promise<Metadata> {
  const { country, locale } = await params;
  return generateHomeMetadata({ country, locale });
}

export default function HomePage() {
  return (
    <section data-visual-baseline="clean" aria-labelledby="labuco-home-title">
      <h1 id="labuco-home-title">Labuco</h1>
    </section>
  );
}
