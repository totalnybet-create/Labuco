"use client";

import { BookOpen, Grid2X2, Home, Search, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/contexts/CartContext";

interface MobileBottomNavProps {
  basePath: string;
}

export function MobileBottomNav({ basePath }: MobileBottomNavProps) {
  const { itemCount, openCart } = useCart();

  const focusSearch = () => {
    document.getElementById("labuco-product-search")?.focus();
  };

  return (
    <nav className="labuco-bottom-nav" aria-label="Nawigacja mobilna">
      <Link href={basePath}>
        <Home aria-hidden="true" />
        <span>Start</span>
      </Link>
      <Link href={`${basePath}/products`}>
        <Grid2X2 aria-hidden="true" />
        <span>Kategorie</span>
      </Link>
      <button type="button" onClick={focusSearch}>
        <Search aria-hidden="true" />
        <span>Szukaj</span>
      </button>
      <Link href={`${basePath}/guides`}>
        <BookOpen aria-hidden="true" />
        <span>Poradniki</span>
      </Link>
      <button type="button" onClick={openCart}>
        <span className="labuco-bottom-cart-icon">
          <ShoppingCart aria-hidden="true" />
          {itemCount > 0 && <b>{itemCount > 99 ? "99+" : itemCount}</b>}
        </span>
        <span>Koszyk</span>
      </button>
    </nav>
  );
}
