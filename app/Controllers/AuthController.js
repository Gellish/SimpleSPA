/**
 * AuthController
 * 
 * Handles authentication operations
 */

import { createContext } from '../Lib/server/http-helpers.js';

export default class AuthController {
    /**
     * Handle user login
     * POST /__api/auth/login
     */
    async login(req, res) {
        const ctx = createContext(req, res);

        try {
            const { email, password } = await ctx.request.body();

            const adminEmail = process.env.ADMIN_EMAIL || 'admin@email.com';
            const adminPassword = process.env.ADMIN_PASSWORD || 'test1234';

            if (email === adminEmail && password === adminPassword) {
                return ctx.response.json({
                    token: 'mock-jwt-token-' + Date.now(),
                    user: {
                        email: adminEmail,
                        name: 'Initial Admin',
                        role: 'admin'
                    }
                });
            } else {
                return ctx.response.status(401).json({
                    message: 'Invalid credentials'
                });
            }
        } catch (error) {
            return ctx.response.error(error, 500);
        }
    }

    /**
     * Handle user logout
     * POST /__api/auth/logout
     */
    async logout(req, res) {
        const ctx = createContext(req, res);

        try {
            // In a real app, invalidate token here
            return ctx.response.json({
                message: 'Logged out successfully'
            });
        } catch (error) {
            return ctx.response.error(error, 500);
        }
    }
}
