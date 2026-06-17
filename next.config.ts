import type { NextConfig } from "next";

const supabaseProjectRef = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : '*.supabase.co';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        // Idealmente substituir por hostname específico do projeto: ex: 'abcdef.supabase.co'
        hostname: supabaseProjectRef,
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Impede clickjacking - a app não pode ser embarcada em iframes externos
          { key: 'X-Frame-Options', value: 'DENY' },
          // Impede MIME sniffing - o browser respeita o Content-Type declarado
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Controla informações enviadas no header Referer
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Desabilita features não utilizadas (câmera, microfone, geolocalização)
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // CSP básico: permite scripts e conexões apenas para o próprio domínio e Supabase
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              `connect-src 'self' https://*.supabase.co wss://*.supabase.co`,
              `img-src 'self' data: blob: https://*.supabase.co https://www.svgrepo.com https://fonts.gstatic.com`,
              "style-src 'self' 'unsafe-inline'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "font-src 'self' data:",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;