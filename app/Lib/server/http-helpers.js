/**
 * HTTP Helper Utilities
 * 
 * Common utilities for handling HTTP requests and responses
 */

/**
 * Parse JSON body from request
 */
export async function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (error) {
                reject(new Error('Invalid JSON'));
            }
        });
        req.on('error', reject);
    });
}

/**
 * Send JSON response
 */
export function jsonResponse(res, data, statusCode = 200) {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
}

/**
 * Send error response
 */
export function errorResponse(res, error, statusCode = 500) {
    console.error('[API Error]:', error);
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
        error: error.message || 'Internal Server Error'
    }));
}

/**
 * Create request context
 */
export function createContext(req, res) {
    return {
        request: {
            method: req.method,
            url: req.url,
            headers: req.headers,
            body: async () => parseBody(req),
            query: (url) => {
                const urlObj = new URL(url, `http://${req.headers.host}`);
                return Object.fromEntries(urlObj.searchParams);
            }
        },
        response: {
            json: (data, statusCode = 200) => jsonResponse(res, data, statusCode),
            error: (error, statusCode = 500) => errorResponse(res, error, statusCode),
            status: (code) => {
                res.statusCode = code;
                return {
                    json: (data) => jsonResponse(res, data, code)
                };
            }
        }
    };
}
