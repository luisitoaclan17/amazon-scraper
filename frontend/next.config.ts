import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow loading Amazon product images from any HTTPS source
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.amazon.com",
      },
      {
        protocol: "https",
        hostname: "**.ssl-images-amazon.com",
      },
      {
        protocol: "https",
        hostname: "m.media-amazon.com",
      },
      {
        protocol: "https",
        hostname: "images-na.ssl-images-amazon.com",
      },
    ],
  },

  // API proxy rewrites: /api/* → backend FastAPI container
  // This allows the frontend to call /api/... without CORS issues
  // and without hardcoding backend URLs inside client components.
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
    // Strip trailing /api so we don't double-prefix the path
    const backendBase = backendUrl.replace(/\/api$/, "");
    return [
      {
        source: "/api/:path*",
        destination: `${backendBase}/api/:path*`,
      },
    ];
  },

  // Strict mode for better React error reporting
  reactStrictMode: true,

  // Disable powered-by header
  poweredByHeader: false,
};

export default nextConfig;
