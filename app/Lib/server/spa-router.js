import fs from 'fs';
import path from 'path';
import { resolve } from 'path';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(path.dirname(path.dirname(path.dirname(__filename))));

export function registerRouting(server) {
    // Aggressive SPA & Clean URL Router
    // We use unshift to ensure this runs BEFORE Vite's internal HTML middleware.
    server.middlewares.stack.unshift({
        route: '',
        handle: (req, res, next) => {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const pathname = url.pathname;

            // 1. Skip API and assets with extensions
            if (pathname.startsWith('/__api') || pathname.includes('.')) {
                return next();
            }

            // 2. Editor Deep Links
            if (pathname.startsWith('/admin/edit/') || pathname.startsWith('/admin/editor/')) {
                console.log('[SPA Router] Deep Link Match:', pathname);
                req.url = '/resources/views/admin/editor.html';
                return next();
            }

            // 3. Home
            if (pathname === '/' || pathname === '') {
                req.url = '/resources/views/index.html';
                return next();
            }

            // 4. Admin Home
            if (pathname === '/admin' || pathname === '/admin/') {
                req.url = '/resources/views/admin.html';
                return next();
            }

            // 5. Clean URL Resolution
            // Try: resources/views/somepage.html
            const cleanPath = resolve(__dirname, 'resources/views', pathname.substring(1) + '.html');
            // Try: resources/views/somedir/index.html
            const indexPath = resolve(__dirname, 'resources/views', pathname.substring(1), 'index.html');

            if (fs.existsSync(cleanPath)) {
                console.log('[SPA Router] Clean URL Match:', pathname);
                req.url = '/resources/views/' + pathname.substring(1) + '.html';
                return next();
            } else if (fs.existsSync(indexPath)) {
                console.log('[SPA Router] Directory Index Match:', pathname);
                // Check if URL ends with slash, if not maybe redirect? But for generic SPA, strictly serving content is fine.
                // Actually better to keep clean URL in browser.
                req.url = '/resources/views/' + pathname.substring(1) + '/index.html';
                return next();
            }

            // 6. Dynamic Blog Post Resolution
            // Check if a markdown file exists for this slug in resources/views/contents
            const cleanSlug = pathname.substring(1); // Remove leading slash
            const mdPath = resolve(__dirname, 'resources/views/contents', cleanSlug + '.md');

            if (fs.existsSync(mdPath)) {
                console.log('[SPA Router] Blog Post Match:', pathname);
                req.url = '/resources/views/post.html';
                return next();
            }

            next();
        }
    });
}
