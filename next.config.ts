import type { NextConfig } from "next";

// The API base URL is injected by Aspire (WithEnvironment("API_URL", ...)) in
// development and by docker-compose in containers. Falls back to the API's
// default local port so `pnpm dev` works standalone too.
const apiUrl = (process.env.API_URL ?? "http://localhost:5080").replace(/\/$/, "");

const nextConfig: NextConfig = {
  // Required by Aspire's AddNextJsApp publish mode and used by our Dockerfile.
  output: "standalone",
  // three.js add-ons ship untranspiled ESM; let Next handle them.
  transpilePackages: ["three"],
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
