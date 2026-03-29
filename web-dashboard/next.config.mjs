export default {
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: 'image.pollinations.ai' }
        ]
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    }
};
