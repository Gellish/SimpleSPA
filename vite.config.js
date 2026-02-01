import { resolve } from 'path'
import { defineConfig } from 'vite'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { registerApiHandlers } from './app/Controllers/ApiHandler.js'
import { registerRouting } from './app/Lib/server/spa-router.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Helper to recursively process @include directives
function processIncludes(html) {
    const includeRegex = /@include\(['"](.+?)['"]\)/g;
    let result = html;
    let match;

    while ((match = includeRegex.exec(html)) !== null) {
        const fullMatch = match[0];
        let includePath = match[1];

        // Auto-migrate old src/ paths
        if (includePath.startsWith('/src/')) includePath = includePath.replace('/src/', '/resources/');
        if (includePath.startsWith('src/')) includePath = includePath.replace('src/', 'resources/');

        const filePath = resolve(__dirname, includePath.startsWith('/') ? includePath.slice(1) : includePath);

        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            // Use split/join instead of replace to avoid special character issues
            result = result.split(fullMatch).join(content);
        } catch (e) {
            console.error(`Error including file: ${filePath}`, e);
            const errorComment = `<!-- Error including ${includePath}: ${e.message} -->`;
            result = result.split(fullMatch).join(errorComment);
        }
    }

    // Recursively process any new includes that were added
    if (includeRegex.test(result) && result !== html) {
        return processIncludes(result);
    }

    return result;
}

export default defineConfig({
    build: {
        outDir: resolve(__dirname, 'public'),
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'resources/views/index.html'),
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
                    })(resolve(__dirname, 'resources/views'))
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
                registerRouting(server);
            }
        },
        {
            name: 'html-transform',
            transformIndexHtml: {
                order: 'pre',
                handler(html, { path: reqPath }) {
                    // Skip layout wrapping for files that are already layout wrappers
                    const skipLayoutPaths = [
                        '/resources/views/layouts/',
                        '/resources/views/app.html'
                    ];

                    if (skipLayoutPaths.some(path => reqPath.includes(path))) {
                        return processIncludes(html);
                    }

                    // Determine layout based on path
                    let layoutFile = 'resources/views/app.html';
                    if (reqPath.includes('/resources/views/admin/') || reqPath.includes('/resources/views/admin.html')) {
                        layoutFile = 'resources/views/layouts/admin.html';
                    }

                    const layoutPath = resolve(__dirname, layoutFile);
                    let layout = fs.readFileSync(layoutPath, 'utf-8');

                    // Extract title from page
                    const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
                    const pageTitle = titleMatch ? titleMatch[1] : 'My App';

                    // Remove title from content
                    let pageContent = html.replace(/<title>[\s\S]*?<\/title>/i, '');

                    if (pageTitle) {
                        // Use split/join for title replacement
                        const titleRegex = /<title>[\s\S]*?<\/title>/i;
                        const layoutTitleMatch = layout.match(titleRegex);
                        if (layoutTitleMatch) {
                            layout = layout.split(layoutTitleMatch[0]).join(`<title>${pageTitle}</title>`);
                        }
                    }

                    // Use split/join for outlet replacement to avoid special character issues
                    let finalHtml = layout.split('<!-- @outlet -->').join(pageContent);

                    // Process includes
                    let processedHtml = processIncludes(finalHtml);

                    return processedHtml;
                }
            }
        }
    ]
})
