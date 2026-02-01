/**
 * Database Configuration
 * 
 * This file contains database connection settings.
 * Currently configured for Supabase as the primary database.
 */

export default {
    /**
     * Default Connection
     * The database connection to use by default
     */
    connection: process.env.DB_CONNECTION || 'supabase',

    /**
     * Supabase Configuration
     */
    supabase: {
        /**
         * Supabase Project URL
         */
        url: process.env.SUPABASE_URL,

        /**
         * Supabase Anonymous/Public Key
         * Safe to use in client-side code
         */
        anonKey: process.env.SUPABASE_ANON_KEY,

        /**
         * Supabase Service Role Key
         * ⚠️ NEVER expose this to the client!
         * Only use server-side for admin operations
         */
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,

        /**
         * Database Options
         */
        options: {
            /**
             * Auto-refresh session
             */
            autoRefreshToken: true,

            /**
             * Persist session in localStorage
             */
            persistSession: true,

            /**
             * Detect session in URL (for OAuth callbacks)
             */
            detectSessionInUrl: true,
        },
    },

    /**
     * Firebase Configuration (Legacy - kept for reference)
     * Can be removed if fully migrated to Supabase
     */
    firebase: {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID,
    },
};
