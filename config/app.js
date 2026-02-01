/**
 * Application Configuration
 * 
 * This file contains the core application settings.
 * Values are loaded from environment variables with sensible defaults.
 */

export default {
    /**
     * Application Name
     * Used in emails, page titles, and branding
     */
    name: process.env.APP_NAME || 'My App',

    /**
     * Application URL
     * The base URL where your application is hosted
     */
    url: process.env.APP_URL || 'http://localhost:5175',

    /**
     * Environment
     * Options: 'development', 'production', 'test'
     */
    env: process.env.NODE_ENV || 'development',

    /**
     * Debug Mode
     * Enable detailed error messages and logging
     */
    debug: process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development',

    /**
     * Port
     * The port number for the Vite dev server
     */
    port: parseInt(process.env.PORT || '5175', 10),

    /**
     * Locale
     * Default language for the application
     */
    locale: process.env.APP_LOCALE || 'en',

    /**
     * Timezone
     * Default timezone for date/time operations
     */
    timezone: process.env.APP_TIMEZONE || 'UTC',
};
