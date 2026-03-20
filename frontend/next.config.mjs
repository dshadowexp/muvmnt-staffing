import createNextIntlPlugin from 'next-intl/plugin';
 
const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
    // cacheComponents: true,
    // Enable image optimization for future use
    images: {
        formats: ["image/avif", "image/webp"],
        remotePatterns: [
            {
                protocol: "https",
                hostname: "firebasestorage.googleapis.com",
            },
            {
                protocol: "https",
                hostname: "1h3.googleusercontent.com",
            },
        ],
    },
}

        //remotePatterns: []//[new URL('https://')]


export default withNextIntl(nextConfig);
