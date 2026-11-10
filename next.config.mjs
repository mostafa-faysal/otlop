/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // لو بتستخدم إصدار أحدث بيقبل allowedDevOrigins مباشرة
  },
  allowedDevOrigins: [
    '192.168.1.8',
    '192.168.1.8:3001',
    'localhost:3001',
  ],
};

export default nextConfig;
