const { Pool } = require('pg');
const fs = require('fs');

const neon = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_R9zTFsPJOQ2G@ep-wispy-truth-adkoe35u-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function fixAdmins() {
  console.log('Fixing admin accounts in correct order...\n');
  
  const data = JSON.parse(fs.readFileSync('backup.json', 'utf8'));
  let admins = data.admins;
  
  // Sort: admins without created_by first, then others
  admins = admins.sort((a, b) => {
    if (!a.created_by && b.created_by) return -1;
    if (a.created_by && !b.created_by) return 1;
    return 0;
  });
  
  console.log(`Found ${admins.length} admin accounts\n`);
  
  // Clear existing admins first
  await neon.query('DELETE FROM admins');
  console.log('Cleared existing admins\n');
  
  for (const admin of admins) {
    const adminData = {
      id: admin.id,
      username: admin.username,
      email: admin.email,
      password_hash: admin.password || admin.password_hash,
      role: admin.role || 'Admin',
      is_super_admin: admin.is_super_admin || false,
      permissions: typeof admin.permissions === 'object' ? JSON.stringify(admin.permissions) : admin.permissions || '{}',
      permissions_type: admin.permissions_type || 'object',
      is_active: admin.is_active !== undefined ? admin.is_active : true,
      created_by: admin.created_by || null,
      created_at: admin.created_at,
      updated_at: admin.updated_at,
      last_login: admin.last_login || null
    };
    
    const columns = Object.keys(adminData);
    const values = Object.values(adminData);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    
    try {
      await neon.query(
        `INSERT INTO admins (${columns.join(', ')}) VALUES (${placeholders})`,
        values
      );
      console.log(`✅ Imported: ${admin.username} (${admin.role})`);
    } catch (err) {
      console.log(`❌ Failed: ${admin.username} - ${err.message.substring(0, 60)}`);
    }
  }
  
  // Verify
  const result = await neon.query('SELECT username, role FROM admins ORDER BY id');
  console.log('\n📋 Current admins in Neon:');
  result.rows.forEach(row => {
    console.log(`  - ${row.username} (${row.role})`);
  });
  
  await neon.end();
  console.log('\n✅ Admin import complete!');
}

fixAdmins();