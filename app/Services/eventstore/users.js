/**
 * Event Store Users Service
 * 
 * Uses the local event store for users (offline-first)
 */

export const usersService = {
    /**
     * Get all users from event store
     */
    async getUsers() {
        try {
            const response = await fetch('/__api/aggregates?type=user');
            const data = await response.json();

            return data.aggregates.map(agg => ({
                id: agg.id,
                ...agg.state,
                eventsCount: agg.eventsCount
            }));
        } catch (error) {
            console.error('Failed to fetch users:', error);
            return [];
        }
    },

    /**
     * Get single user by ID
     */
    async getUser(id) {
        try {
            const response = await fetch(`/__api/events?type=user&id=${id}`);
            const data = await response.json();

            // Project the current state from events
            const state = data.events.reduce((acc, event) => {
                return { ...acc, ...event.data };
            }, {});

            return { id, ...state };
        } catch (error) {
            console.error('Failed to fetch user:', error);
            return null;
        }
    },

    /**
     * Create a new user
     */
    async createUser(userData) {
        try {
            const event = {
                type: 'user',
                id: userData.id || 'user-' + Date.now(),
                eventType: 'UserCreated',
                data: userData,
                timestamp: new Date().toISOString()
            };

            const response = await fetch('/__api/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(event)
            });

            return await response.json();
        } catch (error) {
            console.error('Failed to create user:', error);
            throw error;
        }
    },

    /**
     * Update a user
     */
    async updateUser(id, updates) {
        try {
            const event = {
                type: 'user',
                id: id,
                eventType: 'UserUpdated',
                data: updates,
                timestamp: new Date().toISOString()
            };

            const response = await fetch('/__api/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(event)
            });

            return await response.json();
        } catch (error) {
            console.error('Failed to update user:', error);
            throw error;
        }
    },

    /**
     * Delete a user
     */
    async deleteUser(id) {
        try {
            const response = await fetch('/__api/events/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'user', id })
            });

            return await response.json();
        } catch (error) {
            console.error('Failed to delete user:', error);
            throw error;
        }
    }
};
