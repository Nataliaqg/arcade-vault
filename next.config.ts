import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Old Spanish routes (SPEC 01/02) now live under /games.
  async redirects() {
    return [
      { source: "/juego/:id", destination: "/games/:id", permanent: true },
      { source: "/juego/:id/jugar", destination: "/games/:id/play", permanent: true },
    ];
  },
};

export default nextConfig;
