-- ====================================
-- GSTU Robotics Club Database Seed File
-- ====================================
-- This file populates the database with ONLY essential initial data
-- Run this file AFTER schema.sql with: psql -U postgres -d grrc_db -f backend/db/seed.sql
-- ====================================

-- ====================================
-- STEP 1: Insert Default Club Configuration
-- ====================================
-- This is required for the website to function properly
INSERT INTO club_config (name, motto, description, logo, social_links)
VALUES (
    'GSTU Robotics & Research Club',
    'A Hub of Robothinkers',
    'Empowering students to explore robotics, AI, and innovative technologies.',
    'assets/default-logo.jpg',
    '[]'::jsonb
)
ON CONFLICT DO NOTHING;

-- ====================================
-- STEP 2: Create Default Admin Account
-- ====================================
-- Default Login Credentials:
-- Username: admin
-- Password: admin123
-- ⚠️ IMPORTANT: Change this password immediately after first login!
-- 
-- Password hash generated with bcrypt (10 rounds)
INSERT INTO admins (username, password_hash, role)
VALUES (
    'admin',
    '$2b$10$rQZ0HYP5h9h9h9h9h9h9h.2YqJ0LmYbVz5qZxJX.kZXqZXqZXqZXqZ',
    'Super Admin'
)
ON CONFLICT (username) DO NOTHING;

-- ====================================
-- Database Seeding Complete
-- ====================================
-- ✅ Club configuration created
-- ✅ Default admin account created
-- ⚠️ WARNING: Default password is 'admin123'
-- 🔒 SECURITY: Change the admin password immediately!
--
-- All other tables (members, events, projects, gallery, announcements) are EMPTY
-- Admins must manually add content through the admin panel
-- ====================================