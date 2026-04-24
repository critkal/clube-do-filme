#!/usr/bin/env node
require('dotenv').config();

const readline = require('readline');
const { db, initSchema } = require('../db');

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (a) => { rl.close(); resolve(a.trim()); }));
}

(async () => {
  try {
    console.log('[init-db] Applying schema...');
    await initSchema();
    console.log('[init-db] Schema OK.');

    const { rows } = await db.execute("SELECT COUNT(*) AS n FROM members WHERE is_admin = 1");
    const adminCount = Number(rows[0].n);
    if (adminCount === 0) {
      const name = await prompt('First admin first name (blank to skip): ');
      if (name) {
        try {
          await db.execute({
            sql: 'INSERT INTO members (first_name, is_admin) VALUES (?, 1)',
            args: [name],
          });
          console.log(`[init-db] Admin created: ${name}`);
        } catch (err) {
          if (String(err.message || '').includes('UNIQUE')) {
            await db.execute({
              sql: 'UPDATE members SET is_admin = 1 WHERE first_name = ? COLLATE NOCASE',
              args: [name],
            });
            console.log(`[init-db] Promoted existing member "${name}" to admin.`);
          } else {
            throw err;
          }
        }
      } else {
        console.log('[init-db] No admin created. You can promote someone later by setting is_admin = 1.');
      }
    } else {
      console.log(`[init-db] ${adminCount} admin(s) already present, skipping seed.`);
    }

    console.log('[init-db] Done.');
    process.exit(0);
  } catch (err) {
    console.error('[init-db] Failed:', err);
    process.exit(1);
  }
})();
