/**
 * Database Seeders Index
 * 
 * Central entry point for running all seeders
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runSeeders() {
    console.log('🌱 Running database seeders...\n');

    try {
        // Get all seeder files
        const files = await fs.readdir(__dirname);
        const seederFiles = files.filter(f => f.startsWith('seed-') && f.endsWith('.js'));

        for (const file of seederFiles) {
            console.log(`📦 Running: ${file}`);
            const seederPath = join(__dirname, file);

            try {
                await import(seederPath);
                console.log(`✅ Completed: ${file}\n`);
            } catch (error) {
                console.error(`❌ Failed: ${file}`);
                console.error(error.message);
                console.log('');
            }
        }

        console.log('✅ All seeders completed!');
    } catch (error) {
        console.error('❌ Seeder execution failed:', error);
        process.exit(1);
    }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runSeeders();
}

export default runSeeders;
