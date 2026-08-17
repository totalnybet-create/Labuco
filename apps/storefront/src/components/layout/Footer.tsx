import type { Category } from "@spree/sdk";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { isTransactionalCommerceEnabled } from "@/lib/commerce/config";
import { POLICY_LINKS } from "@/lib/constants/policies";
import { getStoreDescription, getStoreName } from "@/lib/store";
import { BrandLogo } from "./BrandLogo";
import { CurrentYear } from "./CurrentYear";

const storeName = getStoreName();
const storeDescription = getStoreDescription();

interface FooterProps {
  basePath: string;
  locale: Locale;
  categoryLinks: ReactNode;
}

interface FooterCategoryLinksProps {
  rootCategories: Category[];
  basePath: string;
}

export function FooterCategoryLinks({
  rootCategories,
  basePath,
}: FooterCategoryLinksProps) {
  return rootCategories.slice(0, 4).map((category) => (
    <li key={category.id}>
      <Link
        href={`${basePath}/c/${category.permalink}`}
        className="text-neutral-400 transition-colors hover:text-neutral-200"
      >
        {category.name}
      </Link>
    </li>
  ));
}

export async function Footer({ basePath, locale, categoryLinks }: FooterProps) {
  const t = await getTranslations({ locale, namespace: "footer" });
  const tp = await getTranslations({ locale, namespace: "policies" });
  const transactionalCommerce = isTransactionalCommerceEnabled();

  return (
    <footer className="bg-primary pb-[calc(68px+env(safe-area-inset-bottom))] text-gray-300 md:pb-0">
      <div className="container mx-auto px-4 py-8 sm:px-6 md:py-12 lg:px-8">
        <div className="labuco-footer-grid grid grid-cols-1 gap-8 md:grid-cols-6">
          <div className="labuco-footer-brand">
            <BrandLogo name={storeName} inverted />
            <p className="mt-4 max-w-md text-neutral-400">
              {locale === "pl" ? storeDescription : t("description")}
            </p>
          </div>

          <div>
            <h3>Zakupy</h3>
            <ul>
              <li>
                <Link href={`${basePath}/products`}>{t("allProducts")}</Link>
              </li>
              {categoryLinks}
            </ul>
          </div>

          <div>
            <h3>Informacje</h3>
            {transactionalCommerce ? (
              <ul>
                {POLICY_LINKS.slice(0, 5).map((policy) => (
                  <li key={policy.slug}>
                    <Link href={`${basePath}/policies/${policy.slug}`}>
                      {tp(policy.nameKey)}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <ul>
                <li>O nas</li>
                <li>Dostawa i płatności</li>
                <li>Zwroty i reklamacje</li>
                <li>Regulamin</li>
                <li>Polityka prywatności</li>
              </ul>
            )}
          </div>

          <div>
            <h3>Pomoc</h3>
            <ul>
              <li>
                <Link href={`${basePath}/poradniki`}>Poradniki</Link>
              </li>
              <li>Najczęstsze pytania</li>
              <li>Kontakt</li>
              <li>
                <Link href={`${basePath}/account`}>Moje konto</Link>
              </li>
            </ul>
          </div>

          <div>
            <h3>Kontakt</h3>
            <p>Dane kontaktowe zostaną opublikowane przed uruchomieniem sprzedaży.</p>
          </div>

          <div>
            <h3>{transactionalCommerce ? "Płatności" : "Sprzedaż"}</h3>
            <p>
              {transactionalCommerce
                ? "Bezpieczne metody płatności dostępne przy zamówieniu."
                : "Zamówienia i metody płatności są w przygotowaniu."}
            </p>
          </div>
        </div>

        <div className="mt-8 border-t border-neutral-800 pt-8 text-center text-neutral-400">
          <p>
            &copy; <CurrentYear /> {storeName}
          </p>
        </div>
      </div>
    </footer>
  );
}
