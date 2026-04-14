import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ALTER TYPE ADD VALUE cannot run inside a transaction in PostgreSQL.
// Run these enum additions separately, before the main transactional migration.
const ENUM_ADDITIONS = [
  `DO $$ BEGIN ALTER TYPE interest_status ADD VALUE IF NOT EXISTS 'lost'; EXCEPTION WHEN others THEN NULL; END $$`,
  `DO $$ BEGIN ALTER TYPE interest_status ADD VALUE IF NOT EXISTS 'in_service'; EXCEPTION WHEN others THEN NULL; END $$`,
  `DO $$ BEGIN ALTER TYPE interest_status ADD VALUE IF NOT EXISTS 'pre_enrolled'; EXCEPTION WHEN others THEN NULL; END $$`,
  `DO $$ BEGIN ALTER TYPE period_type ADD VALUE IF NOT EXISTS 'dia_inteiro'; EXCEPTION WHEN others THEN NULL; END $$`,
];

export async function runMigrations(retries = 10, delay = 3000) {
  const initSQL = readFileSync(join(__dirname, '..', 'db', 'init.sql'), 'utf8');

  // Strip DO blocks that add enum values so they don't run inside a transaction
  const safeSQL = initSQL
    .replace(/DO \$\$[^]*?ALTER TYPE \w+ ADD VALUE[^]*?\$\$;?\s*/g, '')
    .trim();

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const client = await pool.connect();
      try {
        // 1. Add enum values outside any transaction (Postgres requirement)
        for (const sql of ENUM_ADDITIONS) {
          try { await client.query(sql); } catch { /* ignore: type may not exist yet */ }
        }

        // 2. Execute the rest of init.sql in a single transaction
        await client.query('BEGIN');
        await client.query(safeSQL);
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
