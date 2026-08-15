interface BrandLogoProps {
  name: string;
  className?: string;
  compact?: boolean;
  inverted?: boolean;
}

/** LABUCO wordmark tuned to the approved dark-green mobile reference. */
export function BrandLogo({
  name,
  className = "",
  compact = false,
  inverted = false,
}: BrandLogoProps) {
  const markSize = compact ? "size-7" : "size-8";
  const wordmarkSize = compact ? "text-lg" : "text-xl";
  const markColor = inverted ? "text-lime-500" : "text-emerald-800";
  const wordmarkColor = inverted ? "text-white" : "text-slate-950";

  return (
    <span
      className={`inline-flex items-center gap-2 whitespace-nowrap ${className}`}
    >
      <svg
        viewBox="0 0 48 48"
        className={`${markSize} shrink-0 ${markColor}`}
        aria-hidden="true"
      >
        <g
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M24 42V13" strokeWidth="2.1" />
          <path d="M24 14C20 8 19 4 24 1c5 3 4 7 0 13Z" strokeWidth="1.8" />
          <path d="M22 17C14 13 10 10 9 5c7 0 12 4 13 12Z" strokeWidth="1.8" />
          <path d="M26 17c8-4 12-7 13-12-7 0-12 4-13 12Z" strokeWidth="1.8" />
          <path d="M21 22C12 21 7 19 4 14c8-2 14 1 17 8Z" strokeWidth="1.8" />
          <path d="M27 22c9-1 14-3 17-8-8-2-14 1-17 8Z" strokeWidth="1.8" />
          <path d="M21 28c-8 1-13 0-17-4 7-3 13-2 17 4Z" strokeWidth="1.8" />
          <path d="M27 28c8 1 13 0 17-4-7-3-13-2-17 4Z" strokeWidth="1.8" />
        </g>
      </svg>
      <span
        className={`${wordmarkSize} ${wordmarkColor} font-semibold leading-none tracking-[-0.045em]`}
      >
        {name}
      </span>
    </span>
  );
}
