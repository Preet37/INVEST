import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lesson files are read from disk by the import job, so ship them with the server code.
  outputFileTracingIncludes: { "/api/cron/import": ["./content/**/*"] },
};

export default nextConfig;
