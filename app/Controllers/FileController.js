/**
 * FileController
 * 
 * Handles file operations (save, delete)
 */

import fs from 'fs';
import path from 'path';
import { resolve } from 'path';
import { createContext } from '../Lib/server/http-helpers.js';

const __dirname = path.resolve();

export default class FileController {
    /**
     * Validate file path for security
     */
    validatePath(filePath) {
        const fullPath = resolve(__dirname, filePath);

        // Only allow access to resources/ and app/ directories
        if (!fullPath.toLowerCase().includes('resources') &&
            !fullPath.toLowerCase().includes('app')) {
            throw new Error('Access Denied: Invalid path');
        }

        return fullPath;
    }

    /**
     * Save file content
     * POST /__api/save
     */
    async save(req, res) {
        const ctx = createContext(req, res);

        try {
            const { path: filePath, content } = await ctx.request.body();

            // Remove leading slash if present
            const relPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;

            // Validate and get full path
            const fullPath = this.validatePath(relPath);

            // Ensure directory exists
            const dir = path.dirname(fullPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            // Write file
            fs.writeFileSync(fullPath, content, 'utf-8');

            return ctx.response.json({ success: true });
        } catch (error) {
            return ctx.response.error(error, 500);
        }
    }

    /**
     * Delete file
     * POST /__api/delete
     */
    async delete(req, res) {
        const ctx = createContext(req, res);

        try {
            const { path: filePath } = await ctx.request.body();

            // Remove leading slash if present
            const relPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;

            // Validate and get full path
            const fullPath = this.validatePath(relPath);

            // Delete file if it exists
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
            }

            return ctx.response.json({ success: true });
        } catch (error) {
            return ctx.response.error(error, 500);
        }
    }
}
