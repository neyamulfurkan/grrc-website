const { Pool } = require('pg');
const fs = require('fs');

const neon = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_R9zTFsPJOQ2G@ep-wispy-truth-adkoe35u-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function fixAdmins() {
  console.log('Fixing admin accounts...\n');
  
  const data = JSON.parse(fs.readFileSync('backup.json', 'utf8'));
  const admins = data.admins;
  
  console.log(`Found ${admins.length} admin accounts\n`);
  
  for (const admin of admins) {
    // Map old column names to new ones
    const adminData = {
      id: admin.id,
      username: admin.username,
      email: admin.email,
      password_hash: admin.password || admin.password_hash, // Handle both column names
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
      console.log(`✅ Imported admin: ${admin.username}`);
    } catch (err) {
      console.log(`❌ Failed to import ${admin.username}: ${err.message}`);
    }
  }
  
  await neon.end();
  console.log('\n✅ Admin fix complete!');
}

fixAdmins();