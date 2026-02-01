/**
 * Event Store Auth Service
 * 
 * Uses the local event store for authentication (offline-first)
 */

export const authService = {
    /**
     * Login user with email and password
     * Uses local event store for offline authentication
     */
    async login(email, password) {
        // For offline mode, we'll use simple credential checking
        // In a real app, you'd check against stored user events

        const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || import.meta.env.API_ADMIN_EMAIL || 'admin@email.com';
        const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD || import.meta.env.API_ADMIN_PASSWORD || 'test1234';

        if (email === adminEmail && password === adminPassword) {
            const user = {
                id: 'admin-1',
                email: adminEmail,
                name: 'Admin User',
                role: 'admin',
                created_at: new Date().toISOString()
            };

            // Store in localStorage for offline persistence
            localStorage.setItem('auth_user', JSON.stringify(user));
            localStorage.setItem('auth_token', 'offline-token-' + Date.now());

            return user;
        } else {
            throw new Error('Invalid credentials');
        }
    },

    /**
     * Sign up a new user
     */
    async signup(email, password, metadata = {}) {
        const user = {
            id: 'user-' + Date.now(),
            email,
            name: metadata.full_name || email.split('@')[0],
            role: 'user',
            created_at: new Date().toISOString(),
            ...metadata
        };

        // In a real implementation, you'd write a UserCreated event
        // to the event store here

        localStorage.setItem('auth_user', JSON.stringify(user));
        localStorage.setItem('auth_token', 'offline-token-' + Date.now());

        return user;
    },

    /**
     * Logout user
     */
    async logout() {
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_token');
    },

    /**
     * Get current authenticated user
     */
    async getCurrentUser() {
        const userJson = localStorage.getItem('auth_user');
        return userJson ? JSON.parse(userJson) : null;
    },

    /**
     * Update user profile
     */
    async updateProfile(updates) {
        const user = await this.getCurrentUser();
        if (!user) throw new Error('Not authenticated');

        const updatedUser = { ...user, ...updates };
        localStorage.setItem('auth_user', JSON.stringify(updatedUser));

        return updatedUser;
    }
};
