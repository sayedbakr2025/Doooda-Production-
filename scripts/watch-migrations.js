#!/usr/bin/env node
/*
Watcher for opencode migrations: when a new .up.sql is added to supabase/migrations,
trigger a Supabase db push to apply the migration locally.
Note: Ensure you have run `supabase login` and `supabase link --project-ref <id>` at least once.
*/
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const migrationsDir = path.resolve(__dirname, '../supabase/migrations');

let lastRun = 0;

function execCmd(cmd, args) {
  return new Promise((resolve, reject) => {
    const c = spawn(cmd, args, { stdio: 'inherit', shell: true });
    c.on('error', (err) => reject(err));
    c.on('exit', (code) => resolve(code));
  });
}

async function runPush() {
  const now = Date.now();
  // Debounce rapid events
  if (now - lastRun < 1500) return;
  lastRun = now;
  console.log('[Watcher] Detected new migration. Running: supabase db push');
  // Try local global 'supabase' first, then fallback to 'npx supabase'
  let code = await execCmd('supabase', ['db', 'push']).catch(() => 1);
  if (code !== 0) {
    console.log('[Watcher] Global "supabase" command not available or failed. Trying with npx.');
    code = await execCmd('npx', ['supabase', 'db', 'push']);
  }
  if (code === 0) {
    console.log('[Watcher] Migration push completed successfully.');
  } else {
    console.error(`[Watcher] Migration push exited with code ${code}. Check CLI output for details.`);
  }
}

// Ensure directory exists
if (!fs.existsSync(migrationsDir)) {
  console.error(`Migrations directory not found: ${migrationsDir}`);
  process.exit(1);
}

// Initial scan to kick off if there are already .up.sql files
fs.readdir(migrationsDir, (err, files) => {
  if (!err) {
    const hasNew = files.some(f => f.endsWith('.up.sql'));
    if (hasNew) runPush();
  }
});

fs.watch(migrationsDir, (eventType, filename) => {
  if (!filename) return;
  if (filename.endsWith('.up.sql')) {
    // Quick existence check
    const full = path.join(migrationsDir, filename);
    fs.access(full, fs.constants.F_OK, (err) => {
      if (!err) {
        console.log(`[Watcher] Detected new migration file: ${filename}`);
        runPush();
      }
    });
  }
});
