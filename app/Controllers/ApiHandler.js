/**
 * API Handler
 * 
 * Registers API routes using the router infrastructure
 */

import { registerApiRouter } from '../Lib/server/api-router.js';

/**
 * Register API handlers
 * 
 * This function is called by vite.config.js to set up API routes
 */
export function registerApiHandlers(server) {
    registerApiRouter(server);
}
