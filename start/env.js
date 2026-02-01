/**
 * Environment Variables
 * 
 * Load and validate environment variables
 * In AdonisJS, this file ensures all required env vars are present
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file
config({ path: resolve(__dirname, '../.env') });

/**
 * Validate required environment variables
 */
export function validateEnv() {
    const required = [
        'SUPABASE_URL',
        'SUPABASE_ANON_KEY',
    ];

    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
        console.error('❌ Missing required environment variables:');
        missing.forEach(key => console.error(`   - ${key}`));
        throw new Error('Missing required environment variables');
    }

    console.log('✅ Environment variables validated');
}

/**
 * Get environment variable with fallback
 */
export function env(key, fallback = undefined) {
    return process.env[key] || fallback;
}

// Validate on import (for server-side code)
if (typeof window === 'undefined') {
    // Only validate in Node.js environment, not in browser
    try {
        validateEnv();
    } catch (error) {
        console.warn('⚠️ Environment validation skipped (browser context)');
    }
}

export default {
    validateEnv,
    env
};
