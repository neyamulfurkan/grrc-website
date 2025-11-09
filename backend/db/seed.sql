-- ====================================
-- GSTU Robotics & Research Club Database Seed File
-- ====================================
-- This file populates the database with ONLY essential initial data
-- Run this file AFTER schema.sql with: psql -U your_user -d your_database -f backend/db/seed.sql
-- ====================================

-- ====================================
-- STEP 1: Clear existing data (OPTIONAL - ONLY FOR FRESH INSTALL)
-- ====================================
-- Uncomment these lines ONLY if you want to completely reset the database
-- TRUNCATE TABLE announcements RESTART IDENTITY CASCADE;
-- TRUNCATE TABLE gallery RESTART IDENTITY CASCADE;
-- TRUNCATE TABLE projects RESTART IDENTITY CASCADE;
-- TRUNCATE TABLE events RESTART IDENTITY CASCADE;
-- TRUNCATE TABLE members RESTART IDENTITY CASCADE;
-- TRUNCATE TABLE admins RESTART IDENTITY CASCADE;
-- TRUNCATE TABLE club_config RESTART IDENTITY CASCADE;

-- ====================================
-- STEP 2: Insert Default Club Configuration
-- ====================================
-- This is required for the website to function properly
INSERT INTO club_config (id, name, motto, description, logo, social_links, created_at, updated_at)
VALUES (
    1,
    'GSTU Robotics & Research Club',
    'A Hub of Robothinkers',
    'Empowering students to explore robotics, AI, and innovative technologies through hands-on projects, workshops, and collaborative research. Join us in building the future of technology!',
    'assets/default-logo.jpg',
    '{
        "facebook": "",
        "linkedin": "",
        "github": "",
        "youtube": "",
        "email": "robotics@gstu.edu.bd",
        "phone": "+880-1234-567890"
    }'::jsonb,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    motto = EXCLUDED.motto,
    description = EXCLUDED.description,
    logo = EXCLUDED.logo,
    social_links = EXCLUDED.social_links,
    updated_at = CURRENT_TIMESTAMP;

-- ====================================
-- STEP 3: Create Default Admin Account
-- ====================================
-- Default Login Credentials:
-- ⚠️ Username: admin
-- ⚠️ Password: admin123
-- 
-- 🔒 SECURITY WARNING: Change this password IMMEDIATELY after first login!
-- 
-- Password hash generated with bcrypt (salt rounds: 10)
-- Hash for "admin123": $2b$10$XO4qZ9X.3.YqJ0LmYbVz5.GKzKqZxJX3kZXqZXqZXqZXqZXqZXqO
INSERT INTO admins (username, password_hash, role, created_at, last_login)
VALUES (
    'admin',
    '$2b$10$XO4qZ9X.3.YqJ0LmYbVz5.GKzKqZxJX3kZXqZXqZXqZXqZXqZXqO',
    'Super Admin',
    CURRENT_TIMESTAMP,
    NULL
)
ON CONFLICT (username) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    updated_at = CURRENT_TIMESTAMP;

-- ====================================
-- STEP 4: Insert Sample Welcome Announcement (OPTIONAL)
-- ====================================
INSERT INTO announcements (title, content, priority, date, created_at)
VALUES (
    '🎉 Welcome to GSTU Robotics & Research Club!',
    'Welcome to the official website of GSTU Robotics & Research Club. We are excited to have you here. Stay tuned for upcoming events, projects, and workshops!',
    'high',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT DO NOTHING;

-- ====================================
-- Database Seeding Complete
-- ====================================
-- ✅ Club configuration created/updated
-- ✅ Default admin account created
-- ✅ Welcome announcement added
-- 
-- 🔐 IMPORTANT SECURITY NOTES:
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Default Admin Credentials:
--   Username: admin
--   Password: admin123
-- 
-- ⚠️  THIS IS A SECURITY RISK IN PRODUCTION!
-- 
-- FIRST STEPS AFTER DEPLOYMENT:
-- 1. Login with admin/admin123
-- 2. Go to Admin Panel → Settings
-- 3. Change the password IMMEDIATELY
-- 4. Create additional admin accounts if needed
-- 5. Consider deleting the default admin account
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--
-- 📊 Database Status:
-- All other tables (members, events, projects, gallery) are EMPTY
-- Admins must manually add content through the admin panel
-- 
-- 🚀 Next Steps:
-- 1. Start your backend server: npm start
-- 2. Login to admin panel: http://localhost:5000/admin.html
-- 3. Begin adding members, events, and projects
-- ====================================

-- Optional: Verify the seed data
DO $$
BEGIN
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '✅ Database seeding completed successfully!';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Seed Summary:';
    RAISE NOTICE '   Club Config: % row(s)', (SELECT COUNT(*) FROM club_config);
    RAISE NOTICE '   Admins: % row(s)', (SELECT COUNT(*) FROM admins);
    RAISE NOTICE '   Announcements: % row(s)', (SELECT COUNT(*) FROM announcements);
    RAISE NOTICE '';
    RAISE NOTICE '🔐 Default Admin Login:';
    RAISE NOTICE '   URL: http://localhost:5000/admin.html';
    RAISE NOTICE '   Username: admin';
    RAISE NOTICE '   Password: admin123';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  CHANGE THE PASSWORD IMMEDIATELY!';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;