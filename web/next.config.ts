import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/institution/credits",
        destination: "/institution/mocks",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
