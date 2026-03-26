import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function runMigrations(retries = 10, delay = 3000) {
  const initSQL = readFileSync(join(__dirname, '..', 'db', 'init.sql'), 'utf8');

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const client = await pool.connect();
      try {
        await client.query(initSQL);
        console.log('✅ Database migrations completed successfully');
        return;
      } finally {
        client.release();
      }
    } catch (error) {
      if (error.code === '42710') {
        // duplicate_object (enum already exists) — schema is up to date
        console.log('✅ Database schema already up to date');
        return;
      }

      if (error.code === 'ECONNREFUSED' || error.code === 'EAI_AGAIN' || error.code === 'ETIMEDOUT') {
        console.log(`⏳ Waiting for database... attempt ${attempt}/${retries}`);
        if (attempt < retries) {
          await sleep(delay);
          continue;
        }
      }

      console.error(`❌ Migration error (attempt ${attempt}/${retries}):`, error.message);
      if (attempt === retries) throw error;
      await sleep(delay);
    }
  }
}
