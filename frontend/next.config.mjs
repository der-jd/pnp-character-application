/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
  images: {
    unoptimized: true,
  },
};

export default {
  ...nextConfig,
  generateBuildId: async () => {
    // This could be anything, using the latest git hash
    return '42'; // Use a string for safety
  },
};
