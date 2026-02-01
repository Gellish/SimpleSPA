import { resolve } from 'path'
import { defineConfig } from 'vite'
import fs from 'fs'
import path from 'path'
import { registerApiHandlers } from './src/lib/server/api-handlers.js'
import { registerRouting } from './src/lib/server/spa-router.js'

// Helper to recursively process @include directives
function processIncludes(html) {
    return html.replace(/@include\(['"](.+?)['"]\)/g, (match, p1) => {
        const filePath = resolve(__dirname, p1.startsWith('/') ? p1.slice(1) : p1);
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            return processIncludes(content); // Recursive
        } catch (e) {
            console.error(`Error including file: ${filePath}`, e);
            return `<!-- Error including ${p1}: ${e.message} -->`;
        }
    });
}

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'src/route/index.html'),
                ...Object.fromEntries(
                    (function getHtmlFiles(dir, base = '') {
                        let results = [];
                        if (!fs.existsSync(dir)) return results;
                        const list = fs.readdirSync(dir, { withFileTypes: true });
                        for (const entry of list) {
                            const name = path.join(base, entry.name).replace(/\\/g, '/');
                            const fullPath = path.join(dir, entry.name);
                            if (entry.isDirectory()) {
                                results = results.concat(getHtmlFiles(fullPath, name));
                            } else if (entry.name.endsWith('.html') && entry.name !== 'index.html') {
                                results.push([name.replace('.html', ''), fullPath]);
                            }
                        }
                        return results;
                    })(resolve(__dirname, 'src/route'))
                )
            },
        },
    },
    envPrefix: ['VITE_', 'FIREBASE_', 'SUPABASE_', 'USE_FIREBASE', 'API_'],
    plugins: [
        {
            name: 'modular-server-logic',
            configureServer(server) {
                // 1. Register SPA Routing (Highest Priority logic goes here)
                registerRouting(server);

                // 2. Register API Handlers (/__api/...)
                registerApiHandlers(server);
            },
            transformIndexHtml(html, ctx) {
                let layoutPath = resolve(__dirname, 'src/app.html');

                // Determine layout based on route
                if (ctx.filename && (ctx.filename.includes('src/route/admin') || ctx.filename.includes('src\\route\\admin'))) {
                    layoutPath = resolve(__dirname, 'src/admin.html');
                } else if (ctx.originalUrl && ctx.originalUrl.startsWith('/admin')) {
                    layoutPath = resolve(__dirname, 'src/admin.html');
                }

                if (!fs.existsSync(layoutPath)) return html;

                let layout = fs.readFileSync(layoutPath, 'utf-8');
                const titleMatch = html.match(/<title>(.*?)<\/title>/);
                const pageTitle = titleMatch ? titleMatch[1] : null;
                let pageContent = html.replace(/<title>.*?<\/title>/, '');

                if (pageTitle) {
                    layout = layout.replace(/<title>.*?<\/title>/, `<title>${pageTitle}</title>`);
                }

                let finalHtml = layout.replace('<!-- @outlet -->', pageContent);
                let processedHtml = processIncludes(finalHtml);

                // Prevent FOUC (Disabled for debugging blank page)
                return processedHtml;
            }
        }
    ]
})
