/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: "/avatar", destination: "/studio/avatar-v1", permanent: false },
      { source: "/studio/avatar-v1-basic", destination: "/studio/avatar-v1", permanent: false },
      { source: "/studio/avatar-v1-psd", destination: "/studio/avatar-v1", permanent: false },
      { source: "/studio/avatar-v1-psd-voice", destination: "/studio/avatar-v1", permanent: false },
      { source: "/avatar-v2", destination: "/studio/avatar-v2", permanent: false },
      { source: "/avatar-v2-editor", destination: "/editor/psd/avatar-v2", permanent: false },
      { source: "/studio", destination: "/studio/avatar-v1", permanent: false },
      { source: "/editor", destination: "/editor/psd/avatar-v1", permanent: false },
    ];
  },
};

export default nextConfig;
