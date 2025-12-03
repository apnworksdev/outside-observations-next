/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
        port: '',
        pathname: '/images/**',
      },
    ],
    // Optimize for production: only use necessary qualities
    qualities: [75, 90, 100],
    // Enable image optimization
    formats: ['image/avif', 'image/webp'],
  },
  // Disable dev indicators in production
  devIndicators: false,
  // Production optimizations
  compress: true,
  poweredByHeader: false,
  // Only apply webpack config in development
  ...(process.env.NODE_ENV === 'development' && {
    webpack: (config) => {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
      return config;
    },
  }),
};

export default nextConfig;
