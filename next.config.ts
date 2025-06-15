import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'avatars.githubusercontent.com',  // GitHub avatars
      'lh3.googleusercontent.com',     // Google avatars
    ],
  },
};

export default nextConfig;
