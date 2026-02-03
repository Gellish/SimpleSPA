import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    base: '/MicroFramework/',
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                about: resolve(__dirname, 'about.html'),
                docs: resolve(__dirname, 'docs.html'),
                post1: resolve(__dirname, 'post-1.html'),
            },
        },
        outDir: 'dist',
    },
});
