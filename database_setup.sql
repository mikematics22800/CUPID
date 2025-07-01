-- Database setup for CUPID dating app with content moderation

-- Update users table to include moderation fields
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS strikes INTEGER DEFAULT 0;

-- Add images column to users table to store image URLs
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

-- Create banned_users table with simplified structure
CREATE TABLE IF NOT EXISTS banned_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT,
    phone TEXT
);

-- Create violations table for logging
CREATE TABLE IF NOT EXISTS violations (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user_name TEXT,
    user_email TEXT,
    violation_type TEXT,
    message_content TEXT,
    threat_level TEXT,
    reason TEXT,
    detected_keywords TEXT[],
    strike_count INTEGER,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    action_taken TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_strikes ON users(strikes);
CREATE INDEX IF NOT EXISTS idx_banned_users_email ON banned_users(email);
CREATE INDEX IF NOT EXISTS idx_banned_users_phone ON banned_users(phone);
CREATE INDEX IF NOT EXISTS idx_violations_user_id ON violations(user_id);
CREATE INDEX IF NOT EXISTS idx_violations_violation_type ON violations(violation_type);
CREATE INDEX IF NOT EXISTS idx_violations_detected_at ON violations(detected_at);

-- Enable Row Level Security (RLS)
ALTER TABLE banned_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE violations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for banned_users table
CREATE POLICY "Banned users are viewable by admins" ON banned_users
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Only system can insert banned users" ON banned_users
    FOR INSERT WITH CHECK (true);

-- Create RLS policies for violations table
CREATE POLICY "Violations are viewable by admins" ON violations
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Only system can insert violations" ON violations
    FOR INSERT WITH CHECK (true);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON banned_users TO authenticated;
GRANT ALL ON violations TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated; 