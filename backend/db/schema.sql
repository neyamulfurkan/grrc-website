-- ====================================
-- GSTU Robotics & Research Club Database Schema
-- ====================================
-- This file creates all necessary tables for the club management system
-- Run this file with: psql -U postgres -d grrc_db -f backend/db/schema.sql
-- ====================================

-- Drop existing tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS membership_applications CASCADE;
DROP TABLE IF EXISTS alumni CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;
DROP TABLE IF EXISTS gallery CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS members CASCADE;
DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS club_config CASCADE;

-- ====================================
-- Table: club_config
-- Purpose: Stores club-wide configuration and branding information
-- ====================================
CREATE TABLE club_config (
    id SERIAL PRIMARY KEY,
    logo TEXT DEFAULT 'assets/default-logo.jpg',
    club_name VARCHAR(255) NOT NULL,
    club_motto VARCHAR(500),
    club_description TEXT,
    social_links JSONB DEFAULT '[]'::jsonb,
    bkash_number VARCHAR(20) DEFAULT '01712345678',
    membership_fee INTEGER DEFAULT 500,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_club_config_updated_at BEFORE UPDATE ON club_config
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================================
-- Table: admins
-- Purpose: Stores admin user credentials and roles
-- ====================================
CREATE TABLE admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'Admin' CHECK (role IN ('Super Admin', 'Admin', 'Moderator')),
    is_super_admin BOOLEAN DEFAULT false,
    permissions JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES admins(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Index for faster username lookups during authentication
CREATE INDEX idx_admins_username ON admins(username);

-- ====================================
-- Table: members
-- Purpose: Stores club member information and profiles
-- ====================================
CREATE TABLE members (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    photo TEXT, -- URL or path to member photo
    department VARCHAR(100) NOT NULL,
    year VARCHAR(20) NOT NULL, -- e.g., '1st Year', '2nd Year', 'Alumni'
    role VARCHAR(100) NOT NULL CHECK (role IN ('Executive Member', 'General Member', 'Alumni')),
    position VARCHAR(100), -- For executives: 'President', 'Vice President', etc.
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    bio TEXT,
    skills JSONB DEFAULT '[]'::jsonb, -- Array of skill strings
    joined_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX idx_members_role ON members(role);
CREATE INDEX idx_members_department ON members(department);
CREATE INDEX idx_members_email ON members(email);

-- ====================================
-- Table: events
-- Purpose: Stores club events, workshops, and activities
-- ====================================
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) DEFAULT 'General', -- e.g., 'Workshop', 'Competition', 'Social'
    date DATE NOT NULL,
    time VARCHAR(100), -- Stored as string for flexibility (e.g., '10:00 AM - 2:00 PM')
    venue VARCHAR(255) NOT NULL,
    image TEXT, -- URL or path to event image
    status VARCHAR(50) CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled')) DEFAULT 'upcoming',
    registration_link TEXT, -- External registration form link
    details TEXT, -- Additional event details or agenda
    organizer VARCHAR(255), -- Name of event organizer
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for filtering events
CREATE INDEX idx_events_date ON events(date);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_category ON events(category);

-- ====================================
-- Table: projects
-- Purpose: Stores club projects and their details
-- ====================================
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL, -- e.g., 'Robotics', 'AI/ML', 'IoT', 'Web Development'
    status VARCHAR(50) CHECK (status IN ('completed', 'ongoing', 'planned')) DEFAULT 'ongoing',
    image TEXT, -- URL or path to project image
    technologies JSONB DEFAULT '[]'::jsonb, -- Array of technology strings
    team_members JSONB DEFAULT '[]'::jsonb, -- Array of member names or objects
    github_link TEXT, -- GitHub repository URL
    live_link TEXT, -- Live demo or deployment URL
    completion_date DATE,
    features TEXT, -- Comma-separated or newline-separated features
    achievements TEXT, -- Awards, recognition, impact, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for filtering projects
CREATE INDEX idx_projects_category ON projects(category);
CREATE INDEX idx_projects_status ON projects(status);

-- ====================================
-- Table: gallery
-- Purpose: Stores club photos and media items
-- ====================================
CREATE TABLE gallery (
    id SERIAL PRIMARY KEY,
    image TEXT NOT NULL, -- URL or path to image
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL, -- e.g., 'Events', 'Projects', 'Team', 'Achievements'
    date DATE NOT NULL,
    photographer VARCHAR(255), -- Name of photographer or uploader
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for filtering gallery items
CREATE INDEX idx_gallery_category ON gallery(category);
CREATE INDEX idx_gallery_date ON gallery(date);

-- ====================================
-- Table: announcements
-- Purpose: Stores club announcements and important notices
-- ====================================
CREATE TABLE announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    priority VARCHAR(50) CHECK (priority IN ('low', 'normal', 'high')) DEFAULT 'normal',
    date TIMESTAMP NOT NULL, -- When the announcement should be shown from
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for sorting announcements by date and priority
CREATE INDEX idx_announcements_date ON announcements(date DESC);
CREATE INDEX idx_announcements_priority ON announcements(priority);

-- ====================================
-- Membership Applications Table
-- Purpose: Stores membership applications from prospective members
-- ====================================
CREATE TABLE membership_applications (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    student_id VARCHAR(50),
    department VARCHAR(255) NOT NULL,
    year VARCHAR(10) NOT NULL CHECK (year IN ('1st', '2nd', '3rd', '4th')),
    bio TEXT NOT NULL, -- Why they want to join
    skills JSONB DEFAULT '[]'::jsonb, -- Array of skills as JSON
    previous_experience TEXT,
    github_profile VARCHAR(255),
    linkedin_profile VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    applied_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_date TIMESTAMP,
    reviewed_by INTEGER REFERENCES admins(id) ON DELETE SET NULL,
    admin_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for membership applications
CREATE INDEX idx_membership_applications_status_date ON membership_applications(status, applied_date DESC);
CREATE INDEX idx_membership_applications_email ON membership_applications(email);

-- ====================================
-- Alumni Table
-- Purpose: Stores information about club alumni
-- ====================================
CREATE TABLE alumni (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    photo TEXT, -- Base64 or URL
    batch_year VARCHAR(10) NOT NULL, -- Example: '2020-2021'
    department VARCHAR(255) NOT NULL,
    role_in_club VARCHAR(255), -- Their position when active
    achievements TEXT,
    current_position VARCHAR(255), -- Current job/study
    current_company VARCHAR(255),
    bio TEXT,
    email VARCHAR(255),
    phone VARCHAR(20),
    linkedin VARCHAR(255),
    github VARCHAR(255),
    facebook VARCHAR(255),
    is_featured BOOLEAN DEFAULT FALSE, -- Featured alumni
    display_order INTEGER DEFAULT 0, -- For sorting
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create trigger for alumni updated_at timestamp
CREATE TRIGGER update_alumni_updated_at BEFORE UPDATE ON alumni
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes for alumni
CREATE INDEX idx_alumni_batch_year_display_order ON alumni(batch_year DESC, display_order ASC);
CREATE INDEX idx_alumni_featured_display_order ON alumni(is_featured DESC, display_order ASC);

-- ====================================
-- Table: pending_approvals
-- Purpose: Stores pending actions that require super admin approval
-- ====================================
CREATE TABLE pending_approvals (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete'
    module VARCHAR(50) NOT NULL, -- 'members', 'events', 'projects', etc.
    item_data JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by INTEGER REFERENCES admins(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    review_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pending_approvals_status ON pending_approvals(status, created_at DESC);
CREATE INDEX idx_pending_approvals_admin ON pending_approvals(admin_id);

-- ====================================
-- Table: super_admin_settings
-- Purpose: Stores super admin configuration settings
-- ====================================
CREATE TABLE super_admin_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_super_admin_settings_updated_at BEFORE UPDATE ON super_admin_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================================
-- Table: admin_audit_log
-- Purpose: Tracks all admin actions for security and accountability
-- ====================================
CREATE TABLE admin_audit_log (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    action_type VARCHAR(100) NOT NULL,
    module VARCHAR(50) NOT NULL,
    item_id INTEGER,
    action_details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    status VARCHAR(20) DEFAULT 'success',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admin_audit_log_admin ON admin_audit_log(admin_id, created_at DESC);
CREATE INDEX idx_admin_audit_log_module ON admin_audit_log(module, created_at DESC);

-- ====================================
-- Table: alumni_applications
-- Purpose: Stores alumni profile applications
-- ====================================
CREATE TABLE alumni_applications (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    photo TEXT,
    batch_year VARCHAR(10) NOT NULL,
    department VARCHAR(255) NOT NULL,
    role_in_club VARCHAR(255),
    achievements TEXT,
    current_position VARCHAR(255),
    current_company VARCHAR(255),
    bio TEXT,
    email VARCHAR(255),
    phone VARCHAR(20),
    linkedin VARCHAR(255),
    github VARCHAR(255),
    facebook VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    applied_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_date TIMESTAMP,
    reviewed_by INTEGER REFERENCES admins(id) ON DELETE SET NULL,
    admin_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_alumni_applications_status ON alumni_applications(status, applied_date DESC);

-- ====================================
-- Database Initialization Complete
-- ====================================
-- Next step: Run seed.sql to populate with initial data
-- Command: psql -U postgres -d grrc_db -f backend/db/seed.sql
-- ====================================