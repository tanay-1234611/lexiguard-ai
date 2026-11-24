/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Keep native-ish parsing libraries out of the server bundle.
    serverComponentsExternalPackages: ["mammoth", "unpdf"],
  },
};
export default nextConfig;
