/**
 * API Routes
 * 
 * Define all API routes and map them to controllers
 */

export const routes = [
    // Auth routes
    { method: 'POST', path: '/auth/login', controller: 'AuthController', action: 'login' },
    { method: 'POST', path: '/auth/logout', controller: 'AuthController', action: 'logout' },

    // Admin routes
    { method: 'POST', path: '/admin/create-user', controller: 'AdminController', action: 'createUser' },
    { method: 'POST', path: '/admin/update-user', controller: 'AdminController', action: 'updateUser' },

    // Event store routes
    { method: 'GET', path: '/events', controller: 'EventController', action: 'index' },
    { method: 'POST', path: '/events', controller: 'EventController', action: 'store' },
    { method: 'POST', path: '/events/delete', controller: 'EventController', action: 'destroy' },
    { method: 'GET', path: '/aggregates', controller: 'EventController', action: 'aggregates' },

    // File routes
    { method: 'POST', path: '/save', controller: 'FileController', action: 'save' },
    { method: 'POST', path: '/delete', controller: 'FileController', action: 'delete' },
];
