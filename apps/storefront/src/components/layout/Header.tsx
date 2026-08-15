import type { Category } from "@spree/sdk";
import { BookOpen, User } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { CartButton } from "@/components/layout/CartButton";
import { SearchToggle } from "@/components/layout/SearchToggle";
import { isWholesaleEnabled } from "@/lib/spree";
import { getStoreName } from "@/lib/store";

const LazyMobileMenu = dynamic(
  () =>
    import("@/components/layout/MobileMenu").then((mod) => ({
      default: mod.MobileMenu,
    })),
  {
    loading: () => <div className="size-10" aria-hidden="true" />,
  },
);

const LazyRegionPreferences = dynamic(
  () =>
    import("@/components/layout/RegionPreferences").then((mod) => ({
      default: mod.RegionPreferences,
    })),
  {
    loading: () => <div className="size-10" aria-hidden="true" />,
  },
);

const storeName = getStoreName();

interface HeaderProps {
  basePath: string;
  locale: Locale;
  mobileNavigation: ReactNode;
}

interface HeaderMobileMenuProps {
  rootCategories: Category[];
  basePath: string;
}

export function HeaderMobileMenu({
  rootCategories,
  basePath,
}: HeaderMobileMenuProps) {
  return (
    <LazyMobileMenu
      rootCategories={rootCategories}
      basePath={basePath}
      wholesaleEnabled={isWholesaleEnabled()}
    />
  );
}

export async function Header({
  basePath,
  locale,
  mobileNavigation,
}: HeaderProps) {
  const t = await getTranslations({ locale, namespace: "header" });

  return (
    <SearchToggle
      basePath={basePath}
      left={mobileNavigation}
      center={
        <Link href={basePath || "/"} className="labuco-logo-link">
          <BrandLogo name={storeName} inverted />
        </Link>
      }
      rightStart={
        <div className="labuco-region-control">
          <LazyRegionPreferences variant="header" />
        </div>
      }
      rightEnd={
        <>
          <Link
            href={`${basePath}/account`}
            className="labuco-header-action"
            aria-label={t("account")}
          >
            <User aria-hidden="true" />
            <span>Konto</span>
          </Link>
          <Link
            href={`${basePath}/guides`}
            className="labuco-header-action"
            aria-label="Poradniki"
          >
            <BookOpen aria-hidden="true" />
            <span>Poradniki</span>
          </Link>
          <div className="labuco-cart-action">
            <CartButton />
            <span>Koszyk</span>
          </div>
        </>
      }
    />
  );
}
