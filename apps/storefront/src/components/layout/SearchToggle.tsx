"use client";

import { CreditCard, ShieldCheck, Truck } from "lucide-react";
import dynamic from "next/dynamic";
import type { ReactNode } from "react";

const SearchBar = dynamic(
  () =>
    import("@/components/search/SearchBar").then((mod) => ({
      default: mod.SearchBar,
    })),
  {
    loading: () => (
      <div className="labuco-search-skeleton" aria-hidden="true" />
    ),
  },
);

interface SearchToggleProps {
  basePath: string;
  left: ReactNode;
  center: ReactNode;
  rightStart: ReactNode;
  rightEnd: ReactNode;
}

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
      </div>

      <div className="labuco-header-main">
        <div className="labuco-header-left" style={{ transform: "translateX(-8px)" }}>
          {left}
        </div>
        <div className="labuco-header-center" style={{ justifyContent: "center" }}>
          {center}
        </div>
        <div className="labuco-header-right">
          {rightStart}
          {rightEnd}
        </div>
      </div>

      <div className="labuco-header-search">
        <SearchBar basePath={basePath} />
      </div>
    </header>
  );
}
