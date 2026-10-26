/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig & { experimental?: Record<string, any> }} */
const config = {
  reactStrictMode: true,

  /**
   * Enable standalone output for Docker
   */
  output: "standalone",

  /**
   * Expose build-time environment variables
   */
  env: {
    SOURCE_COMMIT: process.env.SOURCE_COMMIT || "unknown",
  },

  /**
   * Ignore ESLint and TypeScript errors during production builds
   */
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  /**
   * Enable instrumentation hook for server initialization
   * Exclude packages from server components bundling
   */
  experimental: {
    instrumentationHook: true,
    serverComponentsExternalPackages: ["node-cron"],
  },

  /**
   * If you are using `appDir` then you must comment the below `i18n` config out.
   *
   * @see https://github.com/vercel/next.js/issues/41980
   */
  i18n: {
    locales: ["uk"],
    defaultLocale: "uk",
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.savekw.tech",
        port: "",
        pathname: "/wp-content/uploads/**",
      },
    ],
  },
};

export default config;
