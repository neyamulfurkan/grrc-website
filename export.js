const { Pool } = require('pg');
const fs = require('fs');

const supabase = new Pool({
  connectionString: 'postgresql://postgres.yizrxcaloctkebavlmpk:M%40%40n123_Furkan@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

const tables = [
  'club_config',
  'admins',
  'members',
  'events',
  'projects',
  'gallery',
  'alumni',
  'alumni_applications',
  'membership_applications',
  'announcements',
  'super_admin_settings',
  'pending_approvals',
  'admin_audit_log'
];

async function exportData() {
  console.log('Starting export from Supabase...\n');
  const data = {};
  
  try {
    await supabase.query('SELECT 1');
    console.log('Connected to Supabase\n');
  } catch (err) {
    console.error('Failed to connect to Supabase:', err.message);
    process.exit(1);
  }
  
  for (const table of tables) {
    try {
      const { rows } = await supabase.query(`SELECT * FROM ${table}`);
      data[table] = rows;
      console.log(`Exported ${table}: ${rows.length} rows`);
    } catch (err) {
      console.log(`Warning - ${table}: ${err.message}`);
      data[table] = [];
    }
  }
  
  fs.writeFileSync('backup.json', JSON.stringify(data, null, 2));
  console.log('\nBackup saved to backup.json');
  console.log('File size:', (fs.statSync('backup.json').size / 1024).toFixed(2), 'KB');
  
  await supabase.end();
  console.log('\nExport complete!');
}

exportData();