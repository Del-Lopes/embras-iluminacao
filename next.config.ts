import type { NextConfig } from "next";

// R2 origins for CSP — derived from env so a future custom read domain works.
// Public read base (images) and the S3 endpoint (browser presigned PUT).
const r2PublicOrigin = (() => {
  try {
    return process.env.R2_PUBLIC_BASE_URL
      ? new URL(process.env.R2_PUBLIC_BASE_URL).origin
      : "https://*.r2.dev";
  } catch {
    return "https://*.r2.dev";
  }
})();

// The AWS SDK uses virtual-hosted-style URLs for presigned PUT, i.e.
// https://<bucket>.<account>.r2.cloudflarestorage.com — so a wildcard host
// is required (the bucket name is prepended as a subdomain).
const r2S3Origin = "https://*.r2.cloudflarestorage.com";

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // VULN-008/009: removed 'unsafe-eval'. Kept 'unsafe-inline' as Next.js
      // injects inline scripts for hydration. 'wasm-unsafe-eval' allows the
      // <model-viewer> WebAssembly decoders (Draco/meshopt) WITHOUT permitting
      // general eval(). In production, consider nonce-based CSP via middleware.
      "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      `img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com ${r2PublicOrigin}`,
      "font-src 'self' https://fonts.gstatic.com",
      // <model-viewer> runs the Draco/KTX2 decoders in a Web Worker created from
      // a blob: URL — without this the worker is blocked (default-src 'self').
      "worker-src 'self' blob:",
      // connect-src:
      //  - blob: / data: → <model-viewer>/three fetch embedded GLB textures from
      //    blob: URLs (via ImageBitmap); without this the texture silently fails
      //    ("Couldn't load texture blob:") and the material renders untextured.
      //  - r2PublicOrigin → fetch the .glb / textures over the public domain
      //  - www.gstatic.com → model-viewer fetches the Draco/KTX2 decoder libs from here
      `connect-src 'self' blob: data: https://*.supabase.co wss://*.supabase.co https://www.gstatic.com ${r2S3Origin} ${r2PublicOrigin}`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // VULN-014: remove X-Powered-By header
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
