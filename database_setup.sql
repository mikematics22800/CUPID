-- Add residence column to users table to store user's location setting (e.g., "Boca Raton, FL, USA")
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS residence TEXT DEFAULT NULL;

-- Add geolocation column to users table to store geographic coordinates [latitude, longitude]
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS geolocation JSONB DEFAULT NULL;

-- Add max_distance column to users table to store user's distance preference (in miles)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS max_distance INTEGER DEFAULT 50;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_residence ON users(residence);
CREATE INDEX IF NOT EXISTS idx_users_geolocation ON users USING GIN(geolocation);
CREATE INDEX IF NOT EXISTS idx_users_max_distance ON users(max_distance); 