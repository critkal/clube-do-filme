#!/usr/bin/env node
/**
 * Initialises a clean local SQLite database for testing.
 * Loads .env.local, applies schema + migrations, and seeds current active members.
 *
 * Usage:
 *   node src/scripts/setupLocalDb.js
 *   npm run setup-local
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.local') });

const { db, initSchema } = require('../db');

const MEMBERS = [
  { first_name: 'Bianca',           is_admin: 0 },
  { first_name: 'Camila',           is_admin: 0 },
  { first_name: 'Carlos',           is_admin: 0 },
  { first_name: 'Daniel',           is_admin: 0 },
  { first_name: 'Esther',           is_admin: 0 },
  { first_name: 'Felipe',           is_admin: 0 },
  { first_name: 'Gabriel',          is_admin: 1 },
  { first_name: 'Gustavo Carvalho', is_admin: 0 },
  { first_name: 'Gustavo Costa',    is_admin: 0 },
  { first_name: 'João Victor',      is_admin: 0 },
  { first_name: 'Lucas',            is_admin: 0 },
  { first_name: 'Matheus',          is_admin: 0 },
  { first_name: 'Pedro',            is_admin: 0 },
  { first_name: 'Rabelo',           is_admin: 0 },
  { first_name: 'Vanessa',          is_admin: 0 },
  { first_name: 'Yuri Alessandro',  is_admin: 0 },
];

(async () => {
  try {
    console.log('[setup-local] Applying schema + migrations...');
    await initSchema();
    console.log('[setup-local] Schema OK.');

    console.log('\n[setup-local] Seeding active members...');
    for (const { first_name, is_admin } of MEMBERS) {
      try {
        await db.execute({
          sql: 'INSERT INTO members (first_name, is_admin, is_active) VALUES (?, ?, 1)',
          args: [first_name, is_admin],
        });
        console.log(`  [+] ${first_name}${is_admin ? ' (admin)' : ''}`);
      } catch (err) {
        if (String(err.message).includes('UNIQUE')) {
          console.log(`  [=] ${first_name} already exists`);
        } else {
          throw err;
        }
      }
    }

    console.log('\n[setup-local] Done. Local DB is ready at server/local.db');
    console.log('[setup-local] Next: npm run seed-history:local -- path/to/seasons.csv\n');
    process.exit(0);
  } catch (err) {
    console.error('[setup-local] Failed:', err);
    process.exit(1);
  }
})();
