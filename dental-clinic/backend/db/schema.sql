-- ========================================================
-- Dental Clinic Appointment Management System
-- Database Schema for Supabase PostgreSQL
-- ========================================================

-- Enable pgcrypto extension for UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. APPOINTMENTS TABLE
-- Stores patient booking requests and their scheduling lifecycle
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_name VARCHAR(150) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    email VARCHAR(255) NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time VARCHAR(10) NOT NULL, -- Format: HH:mm (e.g., '10:30')
    service VARCHAR(100) NOT NULL,
    message TEXT DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. APPOINTMENT CONFLICT PREVENTION (DATABASE-LEVEL CONSTRAINT)
-- Prevents two patients from booking the exact same date and time slot.
-- A slot becomes available again only if the existing appointment status is 'cancelled'.
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_slot 
ON appointments (appointment_date, appointment_time) 
WHERE status != 'cancelled';

-- Helpful performance indexes for filtering and searching
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments (appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments (status);
CREATE INDEX IF NOT EXISTS idx_appointments_created_at ON appointments (created_at DESC);

-- 3. ADMINS TABLE
-- Stores credentials for administrative staff
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) DEFAULT 'Clinic Admin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. AUTOMATIC TIMESTAMP TRIGGER
-- Automatically updates updated_at column on record modification
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_appointments_timestamp ON appointments;
CREATE TRIGGER trg_update_appointments_timestamp
    BEFORE UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp_column();

DROP TRIGGER IF EXISTS trg_update_admins_timestamp ON admins;
CREATE TRIGGER trg_update_admins_timestamp
    BEFORE UPDATE ON admins
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp_column();

-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- Supabase enforces RLS by default. These policies ensure the Express backend
-- can operate seamlessly whether using the Supabase anon key or service role key.
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Allow full access to appointments and admins for backend operations
DROP POLICY IF EXISTS "Backend access on appointments" ON appointments;
CREATE POLICY "Backend access on appointments" 
    ON appointments 
    FOR ALL 
    USING (true) 
    WITH CHECK (true);

DROP POLICY IF EXISTS "Backend access on admins" ON admins;
CREATE POLICY "Backend access on admins" 
    ON admins 
    FOR ALL 
    USING (true) 
    WITH CHECK (true);

-- 6. DEFAULT SEED DATA
-- Default Admin credentials:
-- Email: admin@dentalclinic.com
-- Password: admin123
INSERT INTO admins (email, password_hash, name)
VALUES (
    'admin@dentalclinic.com',
    '$2a$10$MfwxnFlzAvOD0xL8xh15T.bkM2/PcPb/Z5Pfjswr0U58YbYeEOOdm',
    'Dr. Sarah Mitchell (Head Admin)'
)
ON CONFLICT (email) DO NOTHING;
