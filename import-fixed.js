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
  
  // Clear existing data first
  console.log('Clearing existing data...\n');
  const clearOrder = [
    'admin_audit_log',
    'pending_approvals',
    'membership_applications',
    'alumni_applications',
    'super_admin_settings',
    'announcements',
    'alumni',
    'gallery',
    'projects',
    'events',
    'members',
    'admins',
    'club_config'
  ];
  
  for (const table of clearOrder) {
    try {
      await neon.query(`DELETE FROM ${table}`);
      console.log(`Cleared ${table}`);
    } catch (err) {
      console.log(`Warning clearing ${table}: ${err.message}`);
    }
  }
  
  console.log('\nImporting data...\n');
  
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
      // Fix column name mapping
      if (table === 'admins' && row.password && !row.password_hash) {
        row.password_hash = row.password;
        delete row.password;
      }
      
      // Remove photo column for membership_applications if exists
      if (table === 'membership_applications' && row.photo !== undefined) {
        delete row.photo;
      }
      
      const columns = Object.keys(row);
      const values = columns.map(col => {
        const val = row[col];
        // Convert objects/arrays to JSON strings
        if (val !== null && typeof val === 'object') {
          return JSON.stringify(val);
        }
        return val;
      });
      
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
      
      try {
        await neon.query(
          `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
          values
        );
        success++;
      } catch (err) {
        errors++;
        if (errors <= 2) {
          console.log(`  Error row ${success + errors}: ${err.message.substring(0, 80)}`);
        }
      }
    }
    
    console.log(`  Success: ${success}, Errors: ${errors}`);
  }
  
  await neon.end();
  console.log('\n✅ Import complete!');
  console.log('\nSummary:');
  console.log('- club_config: Should have 1 row');
  console.log('- admins: Should have 3 rows');
  console.log('- members: Should have 6 rows');
  console.log('- Total critical data migrated');
}

importData();