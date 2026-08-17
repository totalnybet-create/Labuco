"use client";

import {
  CircleHelp,
  CreditCard,
  Flame,
  Grid2X2,
  ShieldCheck,
  Truck,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { SearchBar } from "@/components/search/SearchBar";

interface SearchToggleProps {
  basePath: string;
  left: ReactNode;
  center: ReactNode;
  rightStart: ReactNode;
  rightEnd: ReactNode;
}

const desktopLinks = [
  ["Produkty", "/products"],
  ["Nowości", "/products"],
  ["Promocje", "/products"],
  ["Poradniki", "/poradniki"],
  ["Marki", "/products"],
  ["Kontakt", "/contact"],
] as const;

export function SearchToggle({
  basePath,
  left,
  center,
  rightStart,
  rightEnd,
}: SearchToggleProps) {
  return (
    <header className="labuco-site-header">
      <div className="labuco-service-bar">
        <span>
          <ShieldCheck aria-hidden="true" /> Dyskretna wysyłka
        </span>
        <span>
          <CreditCard aria-hidden="true" /> Bezpieczne płatności
        </span>
        <span>
          <Truck aria-hidden="true" /> Szybka dostawa
        </span>
        <span className="labuco-service-support">
          <CircleHelp aria-hidden="true" /> Wsparcie i porady
        </span>
      </div>

      <div className="labuco-header-main">
        <div className="labuco-header-left">{left}</div>
        <div className="labuco-header-center">{center}</div>
        <div className="labuco-header-search">
          <SearchBar basePath={basePath} />
        </div>
        <div className="labuco-header-right">
          {rightStart}
          {rightEnd}
        </div>
      </div>

      <nav className="labuco-desktop-nav" aria-label="Główna nawigacja">
        <div className="labuco-desktop-nav-inner">
          <Link className="labuco-nav-categories" href={`${basePath}/products`}>
            <Grid2X2 aria-hidden="true" />
            Wszystkie kategorie
          </Link>
          {desktopLinks.map(([label, href]) => (
            <Link key={label} href={`${basePath}${href}`}>
              {label}
            </Link>
          ))}
          <Link className="labuco-nav-deals" href={`${basePath}/products`}>
            <Flame aria-hidden="true" />
            Strefa Okazji
          </Link>
        </div>
      </nav>
    </header>
  );
}
