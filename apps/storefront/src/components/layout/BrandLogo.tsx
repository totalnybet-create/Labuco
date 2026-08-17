interface BrandLogoProps {
  name: string;
  className?: string;
  compact?: boolean;
  inverted?: boolean;
}

/** LABUCO wordmark and line-leaf emblem used in the supplied storefront reference. */
export function BrandLogo({
  name,
  className = "",
  compact = false,
  inverted = false,
}: BrandLogoProps) {
  const markSize = compact ? "size-8" : "size-10";
  const wordmarkSize = compact ? "text-xl" : "text-2xl";
  const markColor = inverted ? "text-[#a5c900]" : "text-[#668500]";
  const wordmarkColor = inverted ? "text-white" : "text-slate-950";

  return (
    <span
      className={`inline-flex items-center gap-2 whitespace-nowrap ${className}`}
    >
      <svg
        viewBox="0 0 48 48"
        className={`${markSize} shrink-0 ${markColor}`}
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M24 43V18" />
        <path d="M24 21C20 15 18 9 24 3c6 6 4 12 0 18Z" />
        <path d="M22 24C15 22 10 18 9 11c8 0 12 5 13 13Z" />
        <path d="M26 24c7-2 12-6 13-13-8 0-12 5-13 13Z" />
        <path d="M21 28c-7 0-13-2-16-8 8-2 13 1 16 8Z" />
        <path d="M27 28c7 0 13-2 16-8-8-2-13 1-16 8Z" />
        <path d="M20 32c-6 2-11 1-15-3 6-3 11-1 15 3Z" />
        <path d="M28 32c6 2 11 1 15-3-6-3-11-1-15 3Z" />
      </svg>
      <span
        className={`${wordmarkSize} ${wordmarkColor} font-black leading-none tracking-[0.055em]`}
      >
        {name.toUpperCase()}
      </span>
    </span>
  );
}
