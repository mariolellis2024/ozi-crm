import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function runMigrations() {
  const client = await pool.connect();
  try {
    const initSQL = readFileSync(join(__dirname, '..', 'db', 'init.sql'), 'utf8');
    await client.query(initSQL);
    console.log('✅ Database migrations completed successfully');
  } catch (error) {
    // 42710 = duplicate_object (type already exists) — this is fine
    if (error.code === '42710') {
      console.log('✅ Database schema already up to date');
    } else {
      console.error('❌ Migration error:', error.message);
      throw error;
    }
  } finally {
    client.release();
  }
}
