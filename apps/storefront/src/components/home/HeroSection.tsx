import {
  ArrowRight,
  LockKeyhole,
  ShieldCheck,
  Sprout,
  Truck,
} from "lucide-react";
import Link from "next/link";

interface HeroSectionProps {
  basePath: string;
  locale: string;
}

export async function HeroSection({ basePath }: HeroSectionProps) {
  return (
    <section className="labuco-hero">
      <div className="labuco-hero-copy">
        <p className="labuco-eyebrow">LABUCO · INDOOR GROW</p>
        <h1>
          Wszystko, czego potrzebujesz
          <span> do udanej uprawy.</span>
        </h1>
        <p className="labuco-hero-lead">
          Profesjonalne produkty dla początkujących i doświadczonych hodowców.
        </p>

        <div className="labuco-hero-benefits">
          <div>
            <ShieldCheck aria-hidden="true" />
            <span>
              <strong>Dyskretna wysyłka</strong>
              <small>100% anonimowości</small>
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
              <small>SSL &amp; zaufane metody</small>
            </span>
          </div>
        </div>

        <div className="labuco-hero-actions">
          <Link href={`${basePath}/products`} className="labuco-primary-cta">
            Zobacz produkty <ArrowRight aria-hidden="true" />
          </Link>
          <Link href={`${basePath}/products`} className="labuco-text-cta">
            Poradniki uprawy <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </div>

      <div className="labuco-hero-art" aria-hidden="true">
        <div className="labuco-grow-tent">
          <div className="labuco-led-bars">
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
          <div className="labuco-plant plant-one">
            <Sprout />
          </div>
          <div className="labuco-plant plant-two">
            <Sprout />
          </div>
          <div className="labuco-plant plant-three">
            <Sprout />
          </div>
          <div className="labuco-fan">
            <span />
            <span />
            <span />
          </div>
        </div>
        <div className="labuco-hero-vignette" />
      </div>
    </section>
  );
}
