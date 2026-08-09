/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  async redirects() {
    return [
      { source: "/avatar", destination: "/virtual-avatar/v1/studio", permanent: false },
      { source: "/studio", destination: "/virtual-avatar/v1/studio", permanent: false },
      { source: "/studio/avatar-v1", destination: "/virtual-avatar/v1/studio", permanent: false },
      { source: "/studio/avatar-v1-basic", destination: "/virtual-avatar/v1/studio", permanent: false },
      { source: "/studio/avatar-v1-psd", destination: "/virtual-avatar/v1/studio", permanent: false },
      { source: "/studio/avatar-v1-psd-voice", destination: "/virtual-avatar/v1/studio", permanent: false },
      { source: "/editor", destination: "/virtual-avatar/v1/editor", permanent: false },
      { source: "/editor/psd/avatar-v1", destination: "/virtual-avatar/v1/editor", permanent: false },
      { source: "/overlay", destination: "/virtual-avatar/v1/live", permanent: false },
      { source: "/overlay/avatar", destination: "/virtual-avatar/v1/live/avatar", permanent: false },
    ];
  },
};

export default nextConfig;
