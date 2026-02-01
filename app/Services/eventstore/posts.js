/**
 * Event Store Posts Service
 * 
 * Uses the local event store for posts (offline-first)
 */

export const postsService = {
    /**
     * Get all posts from event store
     */
    async getPosts() {
        try {
            const response = await fetch('/__api/aggregates?type=page');
            const data = await response.json();

            return data.aggregates.map(agg => ({
                id: agg.id,
                ...agg.state,
                eventsCount: agg.eventsCount
            }));
        } catch (error) {
            console.error('Failed to fetch posts:', error);
            return [];
        }
    },

    /**
     * Get single post by ID
     */
    async getPost(id) {
        try {
            const response = await fetch(`/__api/events?type=page&id=${id}`);
            const data = await response.json();

            // Project the current state from events
            const state = data.events.reduce((acc, event) => {
                return { ...acc, ...event.data };
            }, {});

            return { id, ...state };
        } catch (error) {
            console.error('Failed to fetch post:', error);
            return null;
        }
    },

    /**
     * Create a new post
     */
    async createPost(postData) {
        try {
            const event = {
                type: 'page',
                id: postData.slug || 'post-' + Date.now(),
                eventType: 'PageCreated',
                data: postData,
                timestamp: new Date().toISOString()
            };

            const response = await fetch('/__api/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(event)
            });

            return await response.json();
        } catch (error) {
            console.error('Failed to create post:', error);
            throw error;
        }
    },

    /**
     * Update a post
     */
    async updatePost(id, updates) {
        try {
            const event = {
                type: 'page',
                id: id,
                eventType: 'PageUpdated',
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
            console.error('Failed to update post:', error);
            throw error;
        }
    },

    /**
     * Delete a post
     */
    async deletePost(id) {
        try {
            const response = await fetch('/__api/events/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'page', id })
            });

            return await response.json();
        } catch (error) {
            console.error('Failed to delete post:', error);
            throw error;
        }
    }
};
