import { ArrowRight, LockKeyhole, ShieldCheck, Truck } from "lucide-react";
import Link from "next/link";

interface HeroSectionProps {
  basePath: string;
  locale: string;
}

const HERO_IMAGE = "/images/pufpuf/reference-hero.webp";

export async function HeroSection({ basePath }: HeroSectionProps) {
  return (
    <section className="labuco-hero">
      <div
        className="labuco-hero-media"
        style={{
          backgroundImage: `url("${HERO_IMAGE}")`,
          width: "100%",
          inset: 0,
          backgroundSize: "cover",
          backgroundPosition: "68% 50%",
        }}
        aria-hidden="true"
      />
      <div className="labuco-hero-vignette" aria-hidden="true" />

      <div className="labuco-hero-copy">
        <p className="labuco-eyebrow">PUFPUF.SHOP · INDOOR GROW</p>
        <h1>
          Wszystko, czego potrzebujesz
          <span> do udanej uprawy.</span>
        </h1>
        <p className="labuco-hero-lead">
          Profesjonalne produkty dla początkujących i doświadczonych growerów.
        </p>

        <div className="labuco-hero-benefits">
          <div>
            <ShieldCheck aria-hidden="true" />
            <span>
              <strong>Dyskretna wysyłka</strong>
              <small>Neutralne opakowanie</small>
            </span>
          </div>
          <div>
            <Truck aria-hidden="true" />
            <span>
              <strong>Szybka dostawa</strong>
              <small>1–2 dni robocze</small>
            </span>
          </div>
          <div>
            <LockKeyhole aria-hidden="true" />
            <span>
              <strong>Bezpieczne płatności</strong>
              <small>SSL i zaufane metody</small>
            </span>
          </div>
        </div>

        <div className="labuco-hero-actions">
          <Link href={`${basePath}/products`} className="labuco-primary-cta">
            Zobacz produkty <ArrowRight aria-hidden="true" />
          </Link>
          <Link href={`${basePath}/poradniki`} className="labuco-text-cta">
            Poradniki uprawy <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
