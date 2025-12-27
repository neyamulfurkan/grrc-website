/**
 * One-Time Migration Script
 * Migrates all Base64 images from database to Cloudinary
 * Run with: node backend/migrate-images-to-cloudinary.js
 */

const pool = require('./db/pool');
const cloudinary = require('./config/cloudinary');

async function migrateImages() {
  console.log('🚀 Starting image migration to Cloudinary...\n');
  
  let totalMigrated = 0;
  let totalSize = 0;
  
  try {
    // ========== MIGRATE MEMBERS ==========
    console.log('📊 Migrating MEMBERS photos...');
    const membersResult = await pool.query(`
      SELECT id, name, photo 
      FROM members 
      WHERE photo IS NOT NULL 
      AND photo LIKE 'data:image%'
    `);
    
    console.log(`Found ${membersResult.rows.length} members with Base64 photos`);
    
    for (const member of membersResult.rows) {
      try {
        const photoSize = member.photo.length;
        console.log(`  → Uploading photo for ${member.name} (${(photoSize/1024).toFixed(0)} KB)...`);
        
        const uploadResult = await cloudinary.uploader.upload(member.photo, {
          folder: 'grrc-members',
          transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' },
            { quality: 'auto:good' },
            { fetch_format: 'auto' }
          ],
          resource_type: 'image'
        });
        
        await pool.query('UPDATE members SET photo = $1 WHERE id = $2', [uploadResult.secure_url, member.id]);
        
        totalMigrated++;
        totalSize += photoSize;
        console.log(`  ✅ Migrated ${member.name}`);
      } catch (error) {
        console.error(`  ❌ Failed to migrate ${member.name}:`, error.message);
      }
    }
    
    // ========== MIGRATE EVENTS ==========
    console.log('\n📊 Migrating EVENTS images...');
    const eventsResult = await pool.query(`
      SELECT id, title, image 
      FROM events 
      WHERE image IS NOT NULL 
      AND image LIKE 'data:image%'
    `);
    
    console.log(`Found ${eventsResult.rows.length} events with Base64 images`);
    
    for (const event of eventsResult.rows) {
      try {
        const imageSize = event.image.length;
        console.log(`  → Uploading image for "${event.title}" (${(imageSize/1024).toFixed(0)} KB)...`);
        
        const uploadResult = await cloudinary.uploader.upload(event.image, {
          folder: 'grrc-events',
          transformation: [
            { width: 1200, height: 675, crop: 'fill' },
            { quality: 'auto:good' },
            { fetch_format: 'auto' }
          ],
          resource_type: 'image'
        });
        
        await pool.query('UPDATE events SET image = $1 WHERE id = $2', [uploadResult.secure_url, event.id]);
        
        totalMigrated++;
        totalSize += imageSize;
        console.log(`  ✅ Migrated "${event.title}"`);
      } catch (error) {
        console.error(`  ❌ Failed to migrate "${event.title}":`, error.message);
      }
    }
    
    // ========== MIGRATE PROJECTS ==========
    console.log('\n📊 Migrating PROJECTS images...');
    const projectsResult = await pool.query(`
      SELECT id, title, image 
      FROM projects 
      WHERE image IS NOT NULL 
      AND image LIKE 'data:image%'
    `);
    
    console.log(`Found ${projectsResult.rows.length} projects with Base64 images`);
    
    for (const project of projectsResult.rows) {
      try {
        const imageSize = project.image.length;
        console.log(`  → Uploading image for "${project.title}" (${(imageSize/1024).toFixed(0)} KB)...`);
        
        const uploadResult = await cloudinary.uploader.upload(project.image, {
          folder: 'grrc-projects',
          transformation: [
            { width: 1200, height: 800, crop: 'fill' },
            { quality: 'auto:good' },
            { fetch_format: 'auto' }
          ],
          resource_type: 'image'
        });
        
        await pool.query('UPDATE projects SET image = $1 WHERE id = $2', [uploadResult.secure_url, project.id]);
        
        totalMigrated++;
        totalSize += imageSize;
        console.log(`  ✅ Migrated "${project.title}"`);
      } catch (error) {
        console.error(`  ❌ Failed to migrate "${project.title}":`, error.message);
      }
    }
    
    // ========== MIGRATE ALUMNI (if any Base64 photos exist) ==========
    console.log('\n📊 Migrating ALUMNI photos...');
    const alumniResult = await pool.query(`
      SELECT id, name, photo 
      FROM alumni 
      WHERE photo IS NOT NULL 
      AND photo LIKE 'data:image%'
    `);
    
    console.log(`Found ${alumniResult.rows.length} alumni with Base64 photos`);
    
    for (const alumni of alumniResult.rows) {
      try {
        const photoSize = alumni.photo.length;
        console.log(`  → Uploading photo for ${alumni.name} (${(photoSize/1024).toFixed(0)} KB)...`);
        
        const uploadResult = await cloudinary.uploader.upload(alumni.photo, {
          folder: 'grrc-alumni',
          transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' },
            { quality: 'auto:good' },
            { fetch_format: 'auto' }
          ],
          resource_type: 'image'
        });
        
        await pool.query('UPDATE alumni SET photo = $1 WHERE id = $2', [uploadResult.secure_url, alumni.id]);
        
        totalMigrated++;
        totalSize += photoSize;
        console.log(`  ✅ Migrated ${alumni.name}`);
      } catch (error) {
        console.error(`  ❌ Failed to migrate ${alumni.name}:`, error.message);
      }
    }
    
    // ========== MIGRATE CLUB CONFIG LOGO ==========
    console.log('\n📊 Migrating CLUB CONFIG logo...');
    const configResult = await pool.query(`
      SELECT id, logo 
      FROM club_config 
      WHERE logo IS NOT NULL 
      AND logo LIKE 'data:image%' 
      LIMIT 1
    `);
    
    if (configResult.rows.length > 0) {
      const config = configResult.rows[0];
      try {
        const logoSize = config.logo.length;
        console.log(`  → Uploading club logo (${(logoSize/1024).toFixed(0)} KB)...`);
        
        const uploadResult = await cloudinary.uploader.upload(config.logo, {
          folder: 'grrc-config',
          transformation: [
            { width: 300, height: 300, crop: 'fit' },
            { quality: 'auto:good' },
            { fetch_format: 'auto' }
          ],
          resource_type: 'image'
        });
        
        await pool.query('UPDATE club_config SET logo = $1 WHERE id = $2', [uploadResult.secure_url, config.id]);
        
        totalMigrated++;
        totalSize += logoSize;
        console.log(`  ✅ Migrated club logo`);
      } catch (error) {
        console.error(`  ❌ Failed to migrate club logo:`, error.message);
      }
    } else {
      console.log('  ℹ️  No Base64 logo found in club config');
    }
    
    // ========== SUMMARY ==========
    console.log('\n' + '='.repeat(60));
    console.log('✅ MIGRATION COMPLETE!');
    console.log('='.repeat(60));
    console.log(`📊 Total images migrated: ${totalMigrated}`);
    console.log(`💾 Total Base64 data removed: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`🚀 Your database is now lightweight and fast!`);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

// Run migration
migrateImages();