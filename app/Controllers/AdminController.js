/**
 * AdminController
 * 
 * Handles admin operations (user management)
 */

import { createContext } from '../Lib/server/http-helpers.js';
import { loadEnv } from 'vite';

export default class AdminController {
    constructor() {
        // Load environment variables
        const env = loadEnv('development', process.cwd(), '');
        this.serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
        this.supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
    }

    /**
     * Create a new user (admin only)
     * POST /__api/admin/create-user
     */
    async createUser(req, res) {
        const ctx = createContext(req, res);

        try {
            if (!this.serviceKey) {
                throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
            }

            const { email, password, metadata } = await ctx.request.body();

            const { createClient } = await import('@supabase/supabase-js');
            const supabaseAdmin = createClient(this.supabaseUrl, this.serviceKey);

            const { data, error } = await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: metadata
            });

            if (error) throw error;

            return ctx.response.json({ user: data.user });
        } catch (error) {
            return ctx.response.error(error, 500);
        }
    }

    /**
     * Update user profile (admin only)
     * POST /__api/admin/update-user
     */
    async updateUser(req, res) {
        const ctx = createContext(req, res);

        try {
            if (!this.serviceKey) {
                throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
            }

            const { id, updates } = await ctx.request.body();

            const { createClient } = await import('@supabase/supabase-js');
            const supabaseAdmin = createClient(this.supabaseUrl, this.serviceKey);

            // Update profile
            const { data: profile, error } = await supabaseAdmin
                .from('profiles')
                .upsert({ id, ...updates })
                .select()
                .single();

            if (error) throw error;

            // Update user metadata if username changed
            if (updates.username) {
                await supabaseAdmin.auth.admin.updateUserById(id, {
                    user_metadata: { username: updates.username }
                });
            }

            return ctx.response.json({ success: true, profile });
        } catch (error) {
            return ctx.response.error(error, 500);
        }
    }
}
