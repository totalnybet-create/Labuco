import { ArrowRight, LockKeyhole, ShieldCheck, Truck } from "lucide-react";
import Link from "next/link";

interface HeroSectionProps {
  basePath: string;
  locale: string;
}

const HERO_IMAGE = "/images/pufpuf/reference-hero.webp";
const benefitIconClass = "!h-[16px] !w-[16px] md:!h-[24px] md:!w-[24px]";
const benefitTitleClass = "!text-[6.2px] md:!text-[11px]";
const benefitCopyClass = "!text-[5px] md:!text-[9px]";

export async function HeroSection({ basePath }: HeroSectionProps) {
  return (
    <section className="labuco-hero">
      <div
        className="labuco-hero-media"
        style={{
          backgroundImage: `url("${HERO_IMAGE}")`,
          width: "58%",
          inset: "0 0 0 auto",
          backgroundSize: "auto 100%",
          backgroundPosition: "35% 50%",
          filter: "saturate(1.05) contrast(1.02) brightness(1.08)",
        }}
        aria-hidden="true"
      />
      <div
        className="labuco-hero-vignette"
        style={{
          background:
            "linear-gradient(90deg,#061610 0%,#061610 40%,rgba(6,22,16,.84) 48%,rgba(6,22,16,.24) 59%,rgba(5,15,11,.02) 73%,rgba(5,15,11,.02) 100%),linear-gradient(0deg,rgba(3,13,9,.30),transparent 46%)",
        }}
        aria-hidden="true"
      />

      <div className="labuco-hero-copy">
        <p className="labuco-eyebrow">PUFPUF.SHOP · INDOOR GROW</p>
        <h1 className="!w-[170px] !text-[17px] md:!w-auto md:!max-w-[560px] md:!text-[54px]">
          Wszystko, czego potrzebujesz
          <span> do udanej uprawy.</span>
        </h1>
        <p className="labuco-hero-lead !w-[142px] !text-[7.2px] !leading-[1.35] md:!w-auto md:!max-w-[420px] md:!text-[16px]">
          Profesjonalne produkty dla początkujących i doświadczonych growerów.
        </p>

        <div className="labuco-hero-benefits">
          <div>
            <ShieldCheck className={benefitIconClass} aria-hidden="true" />
            <span>
              <strong className={benefitTitleClass}>Dyskretna wysyłka</strong>
              <small className={benefitCopyClass}>Neutralne opakowanie</small>
            </span>
          </div>
          <div>
            <Truck className={benefitIconClass} aria-hidden="true" />
            <span>
              <strong className={benefitTitleClass}>Szybka dostawa</strong>
              <small className={benefitCopyClass}>1–2 dni robocze</small>
            </span>
          </div>
          <div>
            <LockKeyhole className={benefitIconClass} aria-hidden="true" />
            <span>
              <strong className={benefitTitleClass}>Bezpieczne płatności</strong>
              <small className={benefitCopyClass}>SSL i zaufane metody</small>
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
