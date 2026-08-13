import type { NextConfig } from "next";
import dns from "node:dns";

// Fix querySrv ESERVFAIL for MongoDB Atlas on Windows/local network DNS resolvers
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {
  // Ignore fallback
}

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        canvas: false,
      };
    }
    return config;
  },
  serverExternalPackages: ["mongoose"],
  turbopack: {},
};

export default nextConfig;
