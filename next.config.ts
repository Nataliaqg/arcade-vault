import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Solo tiene efecto sobre HTTPS; el navegador lo ignora en http://localhost.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },

  // Old Spanish routes (SPEC 01/02) now live under /games.
  async redirects() {
    return [
      { source: "/juego/:id", destination: "/games/:id", permanent: true },
      { source: "/juego/:id/jugar", destination: "/games/:id/play", permanent: true },
    ];
  },
};

export default nextConfig;
