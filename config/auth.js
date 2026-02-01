/**
 * Authentication Configuration
 * 
 * This file contains authentication and authorization settings.
 */

export default {
    /**
     * Default Auth Provider
     * Options: 'supabase', 'firebase', 'rest'
     */
    provider: process.env.API_AUTH_PROVIDER || 'supabase',

    /**
     * Session Configuration
     */
    session: {
        /**
         * Session lifetime in seconds
         * Default: 7 days (604800 seconds)
         */
        lifetime: parseInt(process.env.SESSION_LIFETIME || '604800', 10),

        /**
         * Session storage key
         */
        storageKey: 'auth_session',

        /**
         * Auto-refresh session before expiry
         */
        autoRefresh: true,
    },

    /**
     * Password Requirements
     */
    password: {
        /**
         * Minimum password length
         */
        minLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8', 10),

        /**
         * Require uppercase letters
         */
        requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false',

        /**
         * Require numbers
         */
        requireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS !== 'false',

        /**
         * Require special characters
         */
        requireSpecialChars: process.env.PASSWORD_REQUIRE_SPECIAL !== 'false',
    },

    /**
     * User Roles
     * Define available user roles in the system
     */
    roles: {
        superadmin: 'superadmin',
        admin: 'admin',
        user: 'user',
        guest: 'guest',
    },

    /**
     * Default Admin User (for seeding)
     */
    defaultAdmin: {
        email: process.env.ADMIN_EMAIL || 'admin@example.com',
        password: process.env.ADMIN_PASSWORD || 'changeme',
        role: 'superadmin',
    },

    /**
     * OAuth Providers (if needed in the future)
     */
    oauth: {
        google: {
            enabled: process.env.OAUTH_GOOGLE_ENABLED === 'true',
            clientId: process.env.OAUTH_GOOGLE_CLIENT_ID,
            clientSecret: process.env.OAUTH_GOOGLE_CLIENT_SECRET,
        },
        github: {
            enabled: process.env.OAUTH_GITHUB_ENABLED === 'true',
            clientId: process.env.OAUTH_GITHUB_CLIENT_ID,
            clientSecret: process.env.OAUTH_GITHUB_CLIENT_SECRET,
        },
    },

    /**
     * Redirect URLs
     */
    redirects: {
        /**
         * Redirect after successful login
         */
        afterLogin: '/',

        /**
         * Redirect after logout
         */
        afterLogout: '/login',

        /**
         * Redirect if not authenticated
         */
        ifNotAuthenticated: '/login',

        /**
         * Redirect if already authenticated
         */
        ifAuthenticated: '/',
    },
};
