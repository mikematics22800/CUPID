-- Migration: Add acceptance and updated_at fields to date table
-- Run this script to update existing databases

-- Add updated_at column to date table
ALTER TABLE public.date 
ADD COLUMN updated_at timestamp with time zone NOT NULL DEFAULT now();

-- Add accepted column to date table (allows NULL for pending, true for accepted, false for rejected)
ALTER TABLE public.date 
ADD COLUMN accepted boolean;

-- Update existing records to set accepted to true (assuming existing dates were accepted)
UPDATE public.date 
SET accepted = true 
WHERE accepted IS NULL;

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'date' 
AND table_schema = 'public'
ORDER BY ordinal_position;
