import type { NextConfig } from "next";

// R2 origins for CSP — derived from env so a future custom read domain works.
// Public read base (images) and the S3 endpoint (browser presigned PUT).
// O fallback é o CDN real, e não um curinga do r2.dev: este arquivo é lido
// em tempo de BUILD, e se a variável não estiver presente nesse momento (o
// build roda antes de o runtime receber o env), tanto a CSP quanto a lista de
// hosts do next/image nasceriam sem o domínio que serve todas as fotos.
const R2_FALLBACK_ORIGIN = "https://cdn.embrasilumina.com.br";

const r2PublicOrigin = (() => {
  try {
    return process.env.R2_PUBLIC_BASE_URL
      ? new URL(process.env.R2_PUBLIC_BASE_URL).origin
      : R2_FALLBACK_ORIGIN;
  } catch {
    return R2_FALLBACK_ORIGIN;
  }
})();

const r2PublicHost = new URL(r2PublicOrigin).hostname;

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
    // camera e xr-spatial-tracking liberados para a PRÓPRIA origem: o AR do
    // <model-viewer> por WebXR (Android/Chrome) precisa dos dois, e com
    // camera=() a sessão nem chega a ser pedida. Continuam negados para
    // iframes de terceiros, que é o que o vazio garantia.
    value:
      "camera=(self), microphone=(), geolocation=(), interest-cohort=(), xr-spatial-tracking=(self)",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // VULN-008/009: removed 'unsafe-eval'. Kept 'unsafe-inline' as Next.js
      // injects inline scripts for hydration. 'wasm-unsafe-eval' allows the
      // <model-viewer> WebAssembly decoders (Draco/meshopt) WITHOUT permitting
      // general eval(). In production, consider nonce-based CSP via middleware.
      //
      // 'unsafe-eval' SÓ em desenvolvimento: o webpack em modo dev compila os
      // bundles com eval() para gerar source maps, e sem isso o CSP bloqueia o
      // script, o React não hidrata e a página fica sem interatividade nenhuma
      // (botões e drawers mortos). O Turbopack não usa eval, então o problema
      // só aparece com `next dev --webpack`.
      // A build de produção nunca passa por aqui: NODE_ENV é 'production'.
      `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${
        process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""
      }`,
      "style-src 'self' 'unsafe-inline'",
      `img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com ${r2PublicOrigin}`,
      "font-src 'self' https://fonts.gstatic.com",
      // media-src: sem esta linha o <video> cairia no default-src 'self' e o
      // arquivo servido pelo CDN do R2 seria bloqueado. O img-src acima já
      // libera a mesma origem para as fotos.
      `media-src 'self' blob: ${r2PublicOrigin}`,
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
      // Vídeo institucional de fundo embedado do YouTube (domínio nocookie, sem
      // tracking). Sem isto o iframe cai no default-src 'self' e é bloqueado.
      "frame-src https://www.youtube-nocookie.com",
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
    // Sem esta lista o next/image recusa qualquer URL externa, e as fotos
    // vindas do CDN quebram a página inteira com "hostname is not configured".
    // O domínio principal vem do mesmo env usado na CSP, então trocar de CDN
    // continua sendo uma variável só.
    remotePatterns: [
      { protocol: "https", hostname: r2PublicHost },
      // Endereço direto do bucket, usado antes do domínio próprio e ainda
      // presente em registros antigos.
      { protocol: "https", hostname: "**.r2.dev" },
      // Storage do Supabase, de onde vieram as imagens da primeira versão.
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
};

export default nextConfig;
