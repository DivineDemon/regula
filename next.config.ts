import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      },
    ],
  },
  // Enable code splitting and optimization
  experimental: {
    optimizePackageImports: [
      "@radix-ui/react-label",
      "@radix-ui/react-slot",
      "lucide-react",
      "recharts",
    ],
  },
  // Turbopack configuration (Next.js 16 default)
  // Code splitting is handled automatically by Turbopack
  turbopack: {
    // Turbopack handles code splitting automatically
    // No manual configuration needed for most cases
  },
};

export default nextConfig;
