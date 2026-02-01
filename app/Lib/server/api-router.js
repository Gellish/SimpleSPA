/**
 * API Router
 * 
 * Routes incoming API requests to the appropriate controller
 */

import { routes } from './routes.js';
import AuthController from '../../Controllers/AuthController.js';
import AdminController from '../../Controllers/AdminController.js';
import EventController from '../../Controllers/EventController.js';
import FileController from '../../Controllers/FileController.js';

// Controller registry
const controllers = {
    AuthController: new AuthController(),
    AdminController: new AdminController(),
    EventController: new EventController(),
    FileController: new FileController(),
};

/**
 * Match route based on method and path
 */
function matchRoute(req) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname.replace('/__api', '');

    return routes.find(route =>
        route.method === req.method &&
        (route.path === pathname || route.path === pathname + '/')
    );
}

/**
 * Execute controller action
 */
async function executeController(route, req, res) {
    const controller = controllers[route.controller];

    if (!controller) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({
            error: `Controller ${route.controller} not found`
        }));
    }

    const action = controller[route.action];

    if (!action) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({
            error: `Action ${route.action} not found in ${route.controller}`
        }));
    }

    // Execute controller action
    await action.call(controller, req, res);
}

/**
 * Register API router middleware
 */
export function registerApiRouter(server) {
    server.middlewares.stack.unshift({
        route: '/__api',
        handle: async (req, res, next) => {
            try {
                const route = matchRoute(req);

                if (route) {
                    await executeController(route, req, res);
                } else {
                    // No matching route found
                    const url = new URL(req.url, `http://${req.headers.host}`);
                    const pathname = url.pathname.replace('/__api', '');

                    if (pathname !== '/' && pathname !== '') {
                        res.statusCode = 404;
                        res.setHeader('Content-Type', 'application/json');
                        return res.end(JSON.stringify({
                            error: 'API Endpoint Not Found',
                            path: pathname
                        }));
                    }

                    next();
                }
            } catch (error) {
                console.error('[Router Error]:', error);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: error.message }));
            }
        }
    });
}
