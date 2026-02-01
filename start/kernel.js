/**
 * Kernel
 * 
 * Application bootstrapping and initialization
 * This file is loaded when the application starts
 */

console.log('🚀 Application kernel loaded');

// Export any global initialization here
export default {
    name: 'SPAFrame Kernel',
    version: '1.0.0',

    // Application lifecycle hooks
    async boot() {
        console.log('⚡ Application booting...');

        // Initialize any global services here
        // Example: Load environment variables, connect to databases, etc.

        console.log('✅ Application ready');
    }
};
