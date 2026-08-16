import "@/app/labuco.css";
import "@/app/labuco-products.css";
import type { Category } from "@spree/sdk";
import Link from "next/link";
import { connection } from "next/server";
import { cache, Suspense } from "react";
import { Footer, FooterCategoryLinks } from "@/components/layout/Footer";
import { Header, HeaderMobileMenu } from "@/components/layout/Header";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { getCategories } from "@/lib/data/categories";

interface StorefrontLayoutProps {
  children: React.ReactNode;
  params: Promise<{ country: string; locale: string }>;
}

interface StorefrontNavigationProps {
  basePath: string;
  country: string;
  locale: string;
}

const EMPTY_CATEGORIES: Category[] = [];

function MobileNavigationFallback() {
  return <div aria-hidden="true" className="size-10 rounded-md bg-white/5" />;
}

function FooterCategoryLinksFallback() {
  return (
    <li aria-hidden="true">
      <span className="block h-4 w-24 rounded bg-white/10" />
    </li>
  );
}

const getRootCategories = cache(async (country: string, locale: string) => {
  await connection();

  return getCategories(
    {
      depth_eq: 0,
      expand: ["children.children"],
    },
    { country, locale },
  )
    .then((res) => res.data)
    .catch((error) => {
      console.error("StorefrontLayout: failed to load categories", error);
      return EMPTY_CATEGORIES;
    });
});

async function StorefrontMobileNavigation({
  basePath,
  country,
  locale,
}: StorefrontNavigationProps) {
  const rootCategories = await getRootCategories(country, locale);
  return (
    <HeaderMobileMenu rootCategories={rootCategories} basePath={basePath} />
  );
}

async function StorefrontCategoryNavigation({
  basePath,
  country,
  locale,
}: StorefrontNavigationProps) {
  const rootCategories = await getRootCategories(country, locale);

  return (
    <nav
      aria-label="Kategorie sklepu"
      className="hidden border-b border-white/10 bg-[#10251a] text-[#e5eee7] md:block"
    >
      <ul className="mx-auto flex min-h-12 max-w-[1296px] items-center gap-6 overflow-hidden px-12 text-xs font-semibold">
        <li className="shrink-0">
          <Link
            href={`${basePath}/products`}
            className="font-extrabold text-[#b7f34b] transition-colors hover:text-white"
          >
            Wszystkie produkty
          </Link>
        </li>
        {rootCategories.slice(0, 7).map((category) => (
          <li key={category.id} className="min-w-0 shrink-0">
            <Link
              href={`${basePath}/c/${category.permalink}`}
              className="transition-colors hover:text-[#b7f34b]"
            >
              {category.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

async function StorefrontFooterCategoryLinks({
  basePath,
  country,
  locale,
}: StorefrontNavigationProps) {
  const rootCategories = await getRootCategories(country, locale);
  return (
    <FooterCategoryLinks rootCategories={rootCategories} basePath={basePath} />
  );
}

export default async function StorefrontLayout({
  children,
  params,
}: StorefrontLayoutProps) {
  const { country, locale } = await params;
  const basePath = `/${country}/${locale}`;

  return (
    <>
      <Header
        basePath={basePath}
        locale={locale as Locale}
        mobileNavigation={
          <Suspense fallback={<MobileNavigationFallback />}>
            <StorefrontMobileNavigation
              basePath={basePath}
              country={country}
              locale={locale}
            />
          </Suspense>
        }
      />
      <Suspense fallback={null}>
        <StorefrontCategoryNavigation
          basePath={basePath}
          country={country}
          locale={locale}
        />
      </Suspense>
      <main className="flex-1 labuco-storefront-main">{children}</main>
      <Footer
        basePath={basePath}
        locale={locale as Locale}
        categoryLinks={
          <Suspense fallback={<FooterCategoryLinksFallback />}>
            <StorefrontFooterCategoryLinks
              basePath={basePath}
              country={country}
              locale={locale}
            />
          </Suspense>
        }
      />
      <MobileBottomNav basePath={basePath} />
    </>
  );
}
