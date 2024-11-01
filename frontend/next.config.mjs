/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    output: 'export',
    experimental: {
        missingSuspenseWithCSRBailout: false,
      },
};

export default nextConfig;
