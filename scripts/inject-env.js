// Vercel prebuild hook: inject SUPABASE_URL and SUPABASE_ANON_KEY into app.js
const fs = require('fs');
const path = require('path');

const APP_JS = path.join(__dirname, '..', 'app.js');

const url = process.env.SUPABASE_URL || '';
const key = process.env.SUPABASE_ANON_KEY || '';

if (!url || !key) {
  console.log('SKIP inject-env: SUPABASE_URL or SUPABASE_ANON_KEY missing — keeping placeholders.');
  process.exit(0);
}

let content = fs.readFileSync(APP_JS, 'utf8');
let changed = false;

if (content.includes('__SUPABASE_URL__')) {
  content = content.replace(/__SUPABASE_URL__/g, url);
  changed = true;
}
if (content.includes('__SUPABASE_ANON_KEY__')) {
  content = content.replace(/__SUPABASE_ANON_KEY__/g, key);
  changed = true;
}

if (changed) {
  fs.writeFileSync(APP_JS, content, 'utf8');
  console.log('inject-env: updated app.js with Supabase credentials.');
} else {
  console.log('inject-env: no placeholders found, nothing injected.');
}
