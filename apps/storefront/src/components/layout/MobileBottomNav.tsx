"use client";

import { Grid2X2, Heart, Home, Search, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/contexts/CartContext";

interface MobileBottomNavProps {
  basePath: string;
}

export function MobileBottomNav({ basePath }: MobileBottomNavProps) {
  const { itemCount, openCart } = useCart();

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
      <Link href={`${basePath}/products`}>
        <Search aria-hidden="true" />
        <span>Szukaj</span>
      </Link>
      <Link href={`${basePath}/account`}>
        <Heart aria-hidden="true" />
        <span>Ulubione</span>
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
