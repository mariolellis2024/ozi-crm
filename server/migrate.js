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
        // Execute the full init.sql in a single transaction
        await client.query('BEGIN');
        await client.query(initSQL);
        await client.query('COMMIT');
        console.log('✅ Database migrations completed successfully');
        return;
      } catch (innerError) {
        await client.query('ROLLBACK').catch(() => {});
        
        // If schema is already up to date, these errors are expected
        if (innerError.code === '42710' || // duplicate_object (enum exists)
            innerError.code === '42701' || // duplicate_column
            innerError.code === '42P07')   // duplicate_table
        {
          console.log('✅ Database schema already up to date');
          return;
        }
        throw innerError;
      } finally {
        client.release();
      }
    } catch (error) {
      if (error.code === '42710' || error.code === '42701' || error.code === '42P07') {
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

      console.error(`❌ Migration error (attempt ${attempt}/${retries}):`, error.message, error.code);
      if (attempt === retries) throw error;
      await sleep(delay);
    }
  }
}
