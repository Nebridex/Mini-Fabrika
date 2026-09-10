import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { pool } from './db.js';

const sqlPath = fileURLToPath(new URL('../sql/001_init.sql', import.meta.url));
await pool.query(await readFile(sqlPath, 'utf8'));
await pool.end();
console.log('Database migration completed.');
