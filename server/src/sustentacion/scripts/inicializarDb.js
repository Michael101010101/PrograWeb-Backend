import { readFileSync } from 'node:fs';
import { pool } from '../hu6/db.js';
try {
  await pool.query(readFileSync(new URL('../db/001_hu6_schema.sql', import.meta.url), 'utf8'));
  console.log('Esquema HU-6 creado correctamente (public.sustentaciones + esquema hu6).');
} catch (e) { console.error(e.message); process.exitCode = 1; }
finally { await pool.end(); }
