// frontend/next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    swcMinify: true,
    images: {
      domains: ['localhost'],
    },
    async rewrites() {
      return [
        {
          source: '/api/:path*',
          destination: 'http://backend:8000/api/:path*', // Proxy API requests to backend service
        },
      ];
    },
  };
  
  module.exports = nextConfig;