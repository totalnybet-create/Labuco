interface BrandLogoProps {
  name: string;
  className?: string;
  compact?: boolean;
  inverted?: boolean;
}

/** pufpuf.shop wordmark with a lightweight botanical mark. */
export function BrandLogo({
  name,
  className = "",
  compact = false,
  inverted = false,
}: BrandLogoProps) {
  const displayName =
    !name || name.trim().toLowerCase() === "labuco" ? "pufpuf.shop" : name;
  const markSize = compact ? "size-8" : "size-9";
  const wordmarkSize = compact ? "text-lg" : "text-xl";
  const markColor = inverted ? "text-[#97c928]" : "text-[#6f9d14]";
  const wordmarkColor = inverted ? "text-white" : "text-slate-950";

  return (
    <span
      className={`inline-flex items-center gap-2 whitespace-nowrap ${className}`}
    >
      <svg
        viewBox="0 0 44 44"
        className={`${markSize} shrink-0 ${markColor}`}
        aria-hidden="true"
      >
        <path
          d="M22 39V19M22 23c-7.2-.4-11.8-4.4-12.4-10.9 7.5-.1 12 3.7 12.4 10.9Zm0-5.8c.5-7.2 4.8-11.1 12.4-11.2-.3 6.8-4.8 10.9-12.4 11.2Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M21.8 31.5c-5.8-.2-9.7-3-11.3-7.9 6.2-.9 10.2 1.8 11.3 7.9Zm.4-5.1c1.2-5.1 5-7.6 10.8-7.2-1.1 5.1-4.8 7.6-10.8 7.2Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity=".9"
        />
      </svg>
      <span
        className={`${wordmarkSize} ${wordmarkColor} font-semibold leading-none tracking-[-0.045em]`}
      >
        {displayName}
      </span>
    </span>
  );
}
