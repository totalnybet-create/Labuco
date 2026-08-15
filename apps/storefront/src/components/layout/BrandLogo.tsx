interface BrandLogoProps {
  name: string;
  className?: string;
  compact?: boolean;
  inverted?: boolean;
}

/** Labuco wordmark with an abstract sprout mark for storefront chrome. */
export function BrandLogo({
  name,
  className = "",
  compact = false,
  inverted = false,
}: BrandLogoProps) {
  const markSize = compact ? "size-8" : "size-9";
  const wordmarkSize = compact ? "text-xl" : "text-2xl";
  const markColor = inverted ? "text-emerald-400" : "text-emerald-700";
  const wordmarkColor = inverted ? "text-white" : "text-slate-950";

  return (
    <span
      className={`inline-flex items-center gap-2.5 whitespace-nowrap ${className}`}
    >
      <svg
        viewBox="0 0 40 40"
        className={`${markSize} shrink-0 ${markColor}`}
        aria-hidden="true"
      >
        <rect width="40" height="40" rx="12" fill="currentColor" />
        <path
          d="M20 29V17.5"
          fill="none"
          stroke="white"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M19.8 20.5c-5.6 0-9.2-3.3-9.2-8.4 5.7-.3 9.1 2.5 9.2 8.4Z"
          fill="none"
          stroke="white"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <path
          d="M20.2 17.7c.1-5.6 3.5-8.5 9.2-8.2 0 5.1-3.6 8.3-9.2 8.2Z"
          fill="none"
          stroke="white"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
      </svg>
      <span
        className={`${wordmarkSize} ${wordmarkColor} font-semibold leading-none tracking-[-0.055em]`}
      >
        {name}
      </span>
    </span>
  );
}
