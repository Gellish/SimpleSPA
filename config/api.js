/**
 * API Configuration
 * 
 * This file contains API provider settings and routing configuration.
 */

export default {
    /**
     * API Providers
     * Configure which provider to use for each service
     */
    providers: {
        /**
         * Authentication Provider
         * Options: 'supabase', 'firebase', 'rest'
         */
        auth: process.env.API_AUTH_PROVIDER || 'supabase',

        /**
         * Posts Provider
         * Options: 'supabase', 'firebase', 'rest', 'local'
         */
        posts: process.env.API_POSTS_PROVIDER || 'supabase',

        /**
         * Users Provider
         * Options: 'supabase', 'firebase', 'rest'
         */
        users: process.env.API_USERS_PROVIDER || 'supabase',
    },

    /**
     * API Base URLs
     */
    baseUrls: {
        /**
         * REST API base URL (if using REST provider)
         */
        rest: process.env.API_REST_BASE_URL || 'http://localhost:3333',

        /**
         * Supabase URL
         */
        supabase: process.env.SUPABASE_URL,
    },

    /**
     * API Timeouts (in milliseconds)
     */
    timeout: {
        /**
         * Default request timeout
         */
        default: parseInt(process.env.API_TIMEOUT || '30000', 10),

        /**
         * Upload timeout (for file uploads)
         */
        upload: parseInt(process.env.API_UPLOAD_TIMEOUT || '120000', 10),
    },

    /**
     * Rate Limiting
     */
    rateLimit: {
        /**
         * Enable rate limiting
         */
        enabled: process.env.API_RATE_LIMIT_ENABLED === 'true',

        /**
         * Max requests per window
         */
        maxRequests: parseInt(process.env.API_RATE_LIMIT_MAX || '100', 10),

        /**
         * Time window in seconds
         */
        windowSeconds: parseInt(process.env.API_RATE_LIMIT_WINDOW || '60', 10),
    },

    /**
     * CORS Configuration
     */
    cors: {
        /**
         * Enable CORS
         */
        enabled: true,

        /**
         * Allowed origins
         */
        origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5175'],

        /**
         * Allowed methods
         */
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

        /**
         * Allowed headers
         */
        headers: ['Content-Type', 'Authorization', 'X-Requested-With'],

        /**
         * Allow credentials
         */
        credentials: true,
    },
};
