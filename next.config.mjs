/** @type {import("next").NextConfig} */
const nextConfig = {
  async rewrites() {
    // The wedding site itself stays hand-written static HTML in public/. Next
    // owns /rsvp and /api only. Without this, "/" has no page and 404s, since
    // public/index.html is otherwise reachable only at /index.html.
    return [{ source: '/', destination: '/index.html' }];
  },
};

export default nextConfig;
