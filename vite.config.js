import { resolve } from 'path'
import { defineConfig } from 'vite'
import fs from 'fs'
import tailwindcss from '@tailwindcss/vite'

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
                main: resolve(__dirname, 'index.html'),
                blog: resolve(__dirname, 'pages/blog.html'),
                about: resolve(__dirname, 'pages/about.html'),
                contact: resolve(__dirname, 'pages/contact.html'),
            },
        },
    },
    plugins: [
        tailwindcss(),
        {
            name: 'clean-urls',
            configureServer(server) {
                server.middlewares.use((req, res, next) => {
                    if (req.url === '/') {
                        next();
                        return;
                    }

                    // Logic: If url is /blog, try /pages/blog.html
                    if (req.url === '/blog') {
                        req.url = '/pages/blog.html';
                    }
                    else if (req.url === '/about') {
                        req.url = '/pages/about.html';
                    }
                    else if (req.url === '/contact') {
                        req.url = '/pages/contact.html';
                    }
                    else if (!req.url.endsWith('.html') && !req.url.includes('.')) {
                        // Generic fallback: try adding .html
                    }

                    next();
                });
            },
            // Server-side include processing (Fixes FOUC/Flicker)
            transformIndexHtml(html) {
                // 1. Process @include directives
                let processedHtml = processIncludes(html);

                // 2. Auto-inject visibility: hidden to body (keeps source clean, but fixes FOUC)
                processedHtml = processedHtml.replace('<body>', '<body style="visibility: hidden;">');

                return processedHtml;
            }
        }
    ]
})
