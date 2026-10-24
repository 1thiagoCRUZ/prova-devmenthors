import type { NextConfig } from "next";

/**
 * Origem da API NestJS. Só o servidor do Next conhece este valor: o browser
 * fala com o próprio front (mesma origem) e o rewrite repassa para a API.
 * Assim o cookie httpOnly `exam_token` (path=/exams/:id) fica no domínio do
 * front, sem CORS nem SameSite=None.
 */
const API_ORIGIN = process.env.API_ORIGIN ?? "http://localhost:3000";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    return [
      { source: "/exams", destination: `${API_ORIGIN}/exams` },
      { source: "/exams/:path*", destination: `${API_ORIGIN}/exams/:path*` },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
