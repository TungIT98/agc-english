/** @type {import('next').NextConfig} */
const nextConfig = {
  // Output standalone for Fly.io Docker container
  output: "standalone",
  reactStrictMode: true,

  // Ensure images use absolute URLs in production
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
