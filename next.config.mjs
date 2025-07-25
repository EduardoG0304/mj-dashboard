/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuración base
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone', // Para deployment en Docker o producción
  productionBrowserSourceMaps: false,

  // Configuración de imágenes
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '**.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },

  // Configuración experimental
  experimental: {
    serverActions: true,
    missingSuspenseWithCSRBailout: false,
    taint: true,
  },

  // Manejo de rutas
  skipMiddlewareUrlNormalize: true,
  skipTrailingSlashRedirect: true,

  // Headers de seguridad
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },

  // Redirecciones
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/panel',
        permanent: true,
      },
    ];
  },

  // Rewrites (si es necesario)
  async rewrites() {
    return [];
  },

  // Solución para error de prerenderizado
  routes: async () => {
    return [
      {
        source: '/_not-found',
        destination: '/404',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;