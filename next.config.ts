import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lesson files are read from disk by the import job, so ship them with the server code.
  outputFileTracingIncludes: { "/api/cron/import": ["./content/**/*"] },
  devIndicators: false,
  // Let `next dev` accept requests through the Tailscale MagicDNS name (npm run tailnet).
  // "**" because hosts look like mac.tail1234.ts.net, and "*" only matches one label.
  allowedDevOrigins: ["**.ts.net"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
