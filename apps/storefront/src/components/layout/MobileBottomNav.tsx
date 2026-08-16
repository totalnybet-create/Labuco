"use client";

import { Grid2X2, Heart, Home, Search, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/contexts/CartContext";

interface MobileBottomNavProps {
  basePath: string;
}

const iconClassName = "h-[15px] w-[15px]";

export function MobileBottomNav({ basePath }: MobileBottomNavProps) {
  const { itemCount, openCart } = useCart();

  return (
    <nav
      className="labuco-bottom-nav"
      style={{ minHeight: 28, paddingTop: 1, paddingBottom: 1 }}
      aria-label="Nawigacja mobilna"
    >
      <Link href={basePath}>
        <Home className={iconClassName} aria-hidden="true" />
        <span>Start</span>
      </Link>
      <Link href={`${basePath}/products`}>
        <Grid2X2 className={iconClassName} aria-hidden="true" />
        <span>Kategorie</span>
      </Link>
      <Link href={`${basePath}/products`}>
        <Search className={iconClassName} aria-hidden="true" />
        <span>Szukaj</span>
      </Link>
      <Link href={`${basePath}/ulubione`}>
        <Heart className={iconClassName} aria-hidden="true" />
        <span>Ulubione</span>
      </Link>
      <button type="button" onClick={openCart}>
        <span className="labuco-bottom-cart-icon">
          <ShoppingCart className={iconClassName} aria-hidden="true" />
          {itemCount > 0 && <b>{itemCount > 99 ? "99+" : itemCount}</b>}
        </span>
        <span>Koszyk</span>
      </button>
    </nav>
  );
}
