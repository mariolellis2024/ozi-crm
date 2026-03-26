import pg from 'pg';
const { Pool } = pg;

// Return DATE type as string (YYYY-MM-DD) instead of Date object
pg.types.setTypeParser(1082, (val) => val); // DATE
pg.types.setTypeParser(1114, (val) => val); // TIMESTAMP
pg.types.setTypeParser(1184, (val) => val); // TIMESTAMPTZ

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// Helper: parse PostgreSQL array string "{val1,val2}" into JS array
export function parsePgArray(val) {
  if (Array.isArray(val)) return val;
  if (!val || val === '{}') return [];
  if (typeof val === 'string' && val.startsWith('{') && val.endsWith('}')) {
    return val.slice(1, -1).split(',').filter(Boolean);
  }
  return [];
}

export default pool;
