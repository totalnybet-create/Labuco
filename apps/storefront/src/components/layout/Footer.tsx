import type { Category } from "@spree/sdk";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { isTransactionalCommerceEnabled } from "@/lib/commerce/config";
import { POLICY_LINKS } from "@/lib/constants/policies";
import { isWholesaleEnabled } from "@/lib/spree";
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
  return rootCategories.map((category) => (
    <li key={category.id}>
      <Link
        href={`${basePath}/c/${category.permalink}`}
        className="text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
      >
        {category.name}
      </Link>
    </li>
  ));
}

export async function Footer({ basePath, locale, categoryLinks }: FooterProps) {
  const t = await getTranslations({ locale, namespace: "footer" });
  const tp = await getTranslations({ locale, namespace: "policies" });
  const wholesaleEnabled = isWholesaleEnabled();
  const transactionalCommerce = isTransactionalCommerceEnabled();

  return (
    <footer className="bg-primary text-gray-300">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-5">
          <div className="col-span-1 md:col-span-2">
            <BrandLogo name={storeName} inverted />
            <p className="mt-4 text-sm text-neutral-400">
              {locale === "pl" ? storeDescription : t("description")}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-neutral-300">
              {t("shop")}
            </h3>
            <ul className="mt-4 space-y-3">
              <li>
                <Link
                  href={`${basePath}/products`}
                  className="text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
                >
                  {t("allProducts")}
                </Link>
              </li>
              {categoryLinks}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-medium text-neutral-300">
              {t("account")}
            </h3>
            <ul className="mt-4 space-y-3">
              <li>
                <Link
                  href={`${basePath}/account`}
                  className="text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
                >
                  {t("myAccount")}
                </Link>
              </li>
              {transactionalCommerce && (
                <li>
                  <Link
                    href={`${basePath}/account/orders`}
                    className="text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
                  >
                    {t("orderHistory")}
                  </Link>
                </li>
              )}
              <li>
                <Link
                  href={`${basePath}/ulubione`}
                  className="text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
                >
                  Ulubione
                </Link>
              </li>
              <li>
                <Link
                  href={`${basePath}/cart`}
                  className="text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
                >
                  {t("cart")}
                </Link>
              </li>
              {wholesaleEnabled && transactionalCommerce && (
                <li>
                  <Link
                    href={`${basePath}/wholesale`}
                    className="text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
                  >
                    {t("wholesale")}
                  </Link>
                </li>
              )}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-medium text-neutral-300">
              {transactionalCommerce ? t("policies") : "Informacje"}
            </h3>
            {transactionalCommerce ? (
              <ul className="mt-4 space-y-3">
                {POLICY_LINKS.map((policy) => (
                  <li key={policy.slug}>
                    <Link
                      href={`${basePath}/policies/${policy.slug}`}
                      className="text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
                    >
                      {tp(policy.nameKey)}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="mt-4 space-y-3">
                <li>
                  <Link
                    href={`${basePath}/poradniki`}
                    className="text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
                  >
                    Poradniki i wiedza
                  </Link>
                </li>
                <li className="text-sm leading-6 text-neutral-400">
                  Dokumenty sprzedażowe zostaną opublikowane przed uruchomieniem
                  zamówień.
                </li>
              </ul>
            )}
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-neutral-800 text-xs text-neutral-400 text-center">
          <p>
            &copy; <CurrentYear /> {storeName}
          </p>
        </div>
      </div>
    </footer>
  );
}
