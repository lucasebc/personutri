/** @type {import('next').NextConfig} */
const nextConfig = {
  // NEXT_EXPORT=1 gera o site estático (pasta out/) que o Caddy serve em produção.
  output: process.env.NEXT_EXPORT ? 'export' : undefined,
};
export default nextConfig;
