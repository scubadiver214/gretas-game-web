import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required by Aspire's AddNextJsApp publish mode and used by our Dockerfile.
  output: "standalone",
  // three.js add-ons ship untranspiled ESM; let Next handle them.
  transpilePackages: ["three"],
  reactStrictMode: true,
  agentRules: false,
  // Browser calls go to same-origin /api/*; src/app/api/[...path]/route.ts
  // forwards them to process.env.API_URL at runtime (Aspire / docker-compose).
};

export default nextConfig;
