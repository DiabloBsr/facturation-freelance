import type { NextConfig } from "next";

/**
 * En-têtes de sécurité appliqués à toutes les réponses.
 * La CSP autorise les data: URI (logos, QR 2FA) et blob: (aperçu PDF).
 * `unsafe-inline` reste requis par les styles injectés de Next/Tailwind.
 */
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "object-src 'self'", // aperçu PDF intégré
      "frame-src 'self' blob:",
      "connect-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  // @react-pdf/renderer embarque des binaires (fontkit) qui doivent rester
  // hors du bundle serveur pour que la génération PDF fonctionne.
  serverExternalPackages: ["@react-pdf/renderer"],
  experimental: {
    // Les logos et signatures sont envoyés en data URI dans les actions serveur.
    serverActions: { bodySizeLimit: "8mb" },
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
