import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['tesseract.js', 'tesseract.js-core', 'pdfjs-dist', '@napi-rs/canvas', '@tesseract.js-data/spa'],
  outputFileTracingIncludes: {
    '/api/planos/modelo': ['./assets/planos/modelo-plano-ubicacion-referencial.pdf'],
    '/api/cartas/modelo': ['./assets/cartas/carta-propuesta.docx'],
    '/api/inmuebles/*/minuta-texto': ['./public/branding/logo.png', './assets/pdf-fonts/**', './assets/intermediacion/estructura-*.docx'],
    '/api/inmuebles/*/liquidaciones': ['./public/branding/logo.png'],
    '/api/inmuebles/*/contratos': [
      './node_modules/tesseract.js/src/**', './node_modules/tesseract.js-core/**',
      './node_modules/@tesseract.js-data/spa/**', './node_modules/@napi-rs/canvas*/**',
      './node_modules/pdfjs-dist/**',
    ],
    '/api/inmuebles/*/intermediacion': [
      './assets/intermediacion/*.docx',
      './node_modules/tesseract.js/src/**', './node_modules/tesseract.js-core/**',
      './node_modules/@tesseract.js-data/spa/**', './node_modules/@napi-rs/canvas*/**',
      './node_modules/pdfjs-dist/**',
    ],
    '/api/inmuebles/*/texto-documentos': [
      './node_modules/tesseract.js/src/**', './node_modules/tesseract.js-core/**',
      './node_modules/@tesseract.js-data/spa/**', './node_modules/@napi-rs/canvas*/**',
      './node_modules/pdfjs-dist/**',
    ],
  },
  async rewrites() {
    return [{ source: '/api/inmuebles/:id/intermediacion-alquiler', destination: '/api/inmuebles/:id/intermediacion?operacion=alquiler' }];
  },
  poweredByHeader: false,
  headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ] }, { source: '/api/inmuebles/:id/archivos/:archivoId', headers: [{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }] }];
  },
};

export default nextConfig;
