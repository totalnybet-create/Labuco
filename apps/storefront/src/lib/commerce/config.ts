export type CommerceProviderName = "catalog" | "spree";

/**
 * Selects the runtime commerce provider without coupling React components to a
 * concrete backend. Explicit COMMERCE_PROVIDER wins. When it is not set we
 * preserve the existing Spree path if both required Spree variables exist;
 * otherwise the storefront falls back to the checked-in Labuco catalog.
 *
 * This makes a no-Spree preview a first-class mode instead of a collection of
 * page-level mocks, while keeping the Spree integration available for later.
 */
export function getCommerceProviderName(): CommerceProviderName {
  const explicit = process.env.COMMERCE_PROVIDER?.trim().toLowerCase();

  if (explicit === "catalog" || explicit === "spree") return explicit;

  const spreeConfigured = Boolean(
    process.env.SPREE_API_URL?.trim() &&
      process.env.SPREE_PUBLISHABLE_KEY?.trim(),
  );

  return spreeConfigured ? "spree" : "catalog";
}

export function isCatalogCommerce(): boolean {
  return getCommerceProviderName() === "catalog";
}

export function isTransactionalCommerceEnabled(): boolean {
  return getCommerceProviderName() === "spree";
}
