import 'dotenv/config';
import pool from './server/db.js';

async function run() {
  try {
    const { rows } = await pool.query("SELECT * FROM aluno_curso_interests WHERE status = 'enrolled'");
    console.log("Enrolled rows:", rows);
    const users = await pool.query("SELECT * FROM users");
    console.log("Users:", users.rows);
  } catch (err) { console.error(err); } finally { process.exit(0); }
}
run();
