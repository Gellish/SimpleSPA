/**
 * Test Setup
 * 
 * Global test configuration and utilities
 */

// Add any global test utilities here
global.testUtils = {
    // Example: Create a test user
    createTestUser: () => ({
        id: 'test-user-id',
        email: 'test@example.com',
        user_metadata: {
            full_name: 'Test User',
            role: 'user'
        }
    }),

    // Example: Create a test post
    createTestPost: () => ({
        id: 'test-post-id',
        title: 'Test Post',
        content: 'Test content',
        created_at: new Date().toISOString()
    })
};
