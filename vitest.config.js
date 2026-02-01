import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['tests/**/*.test.js'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'tests/',
                'public/',
                'storage/',
                '*.config.js'
            ]
        }
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, './'),
            '@app': resolve(__dirname, './app'),
            '@config': resolve(__dirname, './config'),
            '@resources': resolve(__dirname, './resources')
        }
    }
})
