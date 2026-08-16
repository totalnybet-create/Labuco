import path from "node:path";
import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import type { RemotePattern } from "next/dist/shared/lib/image-config";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

function spreeImagePatterns(): RemotePattern[] {
  const raw = (
    process.env.SPREE_IMAGES_URL || process.env.SPREE_API_URL
  )?.trim();
  let hostname = "localhost";
  if (raw) {
    try {
      hostname = new URL(raw).hostname;
    } catch {
      // Malformed URL — keep the localhost fallback.
    }
  }
  const pathname = "/rails/active_storage/**";
  return [
    { protocol: "http", hostname, pathname },
    { protocol: "https", hostname, pathname },
  ];
}

const nextConfig: NextConfig = {
  output: "standalone",
  // The no-Spree catalog lives at repository level. Include it in the traced
  // standalone output so staging/production can switch providers without
  // copying thousands of product records into the React source tree.
  outputFileTracingRoot: path.join(__dirname, "../.."),
  outputFileTracingIncludes: {
    "/*": ["../../data/labuco_catalog.json"],
  },
  allowedDevOrigins: ["shop.lvh.me", "*.trycloudflare.com", "192.168.33.13"],
  env: {
    NEXT_PUBLIC_SENTRY_DSN: process.env.SENTRY_DSN || "",
  },
  transpilePackages: ["@spree/sdk"],
  reactCompiler: true,
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-dialog",
    ],
  },
  turbopack: {
    root: __dirname,
  },
  cacheComponents: true,
  cacheLife: {
    tenMinutes: {
      stale: 300,
      revalidate: 600,
      expire: 3600,
    },
  },
  images: {
    qualities: [25, 50, 75, 85, 100],
    dangerouslyAllowLocalIP: true,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      ...spreeImagePatterns(),
      // Product reference images used by the backend-neutral Labuco catalog.
      {
        protocol: "https",
        hostname: "www.growtent.pl",
        pathname: "/hpeciai/**",
      },
      {
        protocol: "https",
        hostname: "growtent.pl",
        pathname: "/hpeciai/**",
      },
    ],
  },
};

const configWithIntl = withNextIntl(nextConfig);

export default process.env.SENTRY_DSN
  ? withSentryConfig(configWithIntl, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: !process.env.CI,
      widenClientFileUpload: true,
      sourcemaps: {
        deleteSourcemapsAfterUpload: true,
      },
      telemetry: false,
    })
  : configWithIntl;
