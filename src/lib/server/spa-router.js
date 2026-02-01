import fs from 'fs';
import path from 'path';
import { resolve } from 'path';

const __dirname = path.resolve();

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
                req.url = '/src/route/admin/editor.html';
                return next();
            }

            // 3. Home
            if (pathname === '/' || pathname === '') {
                req.url = '/src/route/index.html';
                return next();
            }

            // 4. Admin Home
            if (pathname === '/admin' || pathname === '/admin/') {
                req.url = '/src/route/admin/index.html';
                return next();
            }

            // 5. Clean URL Resolution
            // Try: src/route/somepage.html
            const cleanPath = resolve(__dirname, 'src/route', pathname.substring(1) + '.html');
            // Try: src/route/somedir/index.html
            const indexPath = resolve(__dirname, 'src/route', pathname.substring(1), 'index.html');

            if (fs.existsSync(cleanPath)) {
                console.log('[SPA Router] Clean URL Match:', pathname);
                req.url = '/src/route/' + pathname.substring(1) + '.html';
                return next();
            } else if (fs.existsSync(indexPath)) {
                console.log('[SPA Router] Directory Index Match:', pathname);
                // Check if URL ends with slash, if not maybe redirect? But for generic SPA, strictly serving content is fine.
                // Actually better to keep clean URL in browser.
                req.url = '/src/route/' + pathname.substring(1) + '/index.html';
                return next();
            }

            // 6. Dynamic Blog Post Resolution
            // Check if a markdown file exists for this slug in src/route/contents
            const cleanSlug = pathname.substring(1); // Remove leading slash
            const mdPath = resolve(__dirname, 'src/route/contents', cleanSlug + '.md');

            if (fs.existsSync(mdPath)) {
                console.log('[SPA Router] Blog Post Match:', pathname);
                req.url = '/src/route/post.html';
                return next();
            }

            next();
        }
    });
}
