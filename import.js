const { Pool } = require('pg');
const fs = require('fs');

const neon = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_R9zTFsPJOQ2G@ep-wispy-truth-adkoe35u-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function importData() {
  console.log('Starting import to Neon...\n');
  
  try {
    await neon.query('SELECT 1');
    console.log('Connected to Neon\n');
  } catch (err) {
    console.error('Failed to connect to Neon:', err.message);
    process.exit(1);
  }
  
  const data = JSON.parse(fs.readFileSync('backup.json', 'utf8'));
  
  const orderedTables = [
    'club_config',
    'admins',
    'members',
    'events',
    'projects',
    'gallery',
    'alumni',
    'announcements',
    'super_admin_settings',
    'alumni_applications',
    'membership_applications',
    'pending_approvals',
    'admin_audit_log'
  ];
  
  for (const table of orderedTables) {
    const rows = data[table];
    
    if (!rows || rows.length === 0) {
      console.log(`${table}: No data`);
      continue;
    }
    
    console.log(`Importing ${table}: ${rows.length} rows`);
    
    let success = 0;
    let errors = 0;
    
    for (const row of rows) {
      const columns = Object.keys(row);
      const values = Object.values(row);
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
      
      try {
        await neon.query(
          `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
          values
        );
        success++;
      } catch (err) {
        errors++;
        if (errors === 1) {
          console.log(`  Error: ${err.message.substring(0, 100)}`);
        }
      }
    }
    
    console.log(`  Success: ${success}, Errors: ${errors}`);
  }
  
  await neon.end();
  console.log('\nImport complete!');
}

importData();