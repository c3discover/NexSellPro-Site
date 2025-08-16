.*  // (overwrite the whole file)

-- NexSellPro Database Schema Setup
-- Run this in Supabase SQL Editor (once per environment)

-- ===========================
-- 🚧 user_plan: access + billing control
-- ===========================
CREATE TABLE IF NOT EXISTS user_plan (
  id UUID PRIMARY KEY, -- Same as Supabase Auth UID
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  plan TEXT, -- e.g. "free", "beta"
  stripe_customer_id TEXT,
  created_at TIMESTAMP DEFAULT now(),
  last_updated TIMESTAMP DEFAULT now()
);

ALTER TABLE user_plan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow user to insert own user_plan"
  ON user_plan FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow user to read own user_plan"
  ON user_plan FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Allow user to update own user_plan"
  ON user_plan FOR UPDATE
  USING (auth.uid() = id);

-- ===========================
-- 👤 user_profiles: optional onboarding/marketing info
-- ===========================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  business_name TEXT,
  how_did_you_hear TEXT,
  created_at TIMESTAMP DEFAULT now(),
  last_updated TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User can read own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "User can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "User can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- ===========================
-- 🔁 Shared auto-timestamp trigger
-- ===========================
CREATE OR REPLACE FUNCTION update_last_updated_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_plan_last_updated
  BEFORE UPDATE ON user_plan
  FOR EACH ROW EXECUTE FUNCTION update_last_updated_column();

CREATE TRIGGER update_user_profiles_last_updated
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_last_updated_column();

-- ===========================
-- 📊 Migration: Add status column to user_plan
-- ===========================
-- Add status column with default value
ALTER TABLE user_plan
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'inactive';

-- Add last_login column for tracking user activity
ALTER TABLE user_plan
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;

-- Update existing users to active status
UPDATE user_plan 
SET status = 'active' 
WHERE email IS NOT NULL AND status = 'inactive';

-- Add comment for documentation
COMMENT ON COLUMN user_plan.status IS 'User account status: inactive, active, suspended, cancelled';
COMMENT ON COLUMN user_plan.last_login IS 'Timestamp of user last login for activity tracking';
