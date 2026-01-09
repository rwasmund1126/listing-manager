-- Listing Manager Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE item_condition AS ENUM ('new_with_tags', 'like_new', 'good', 'fair');
CREATE TYPE platform AS ENUM ('ebay', 'facebook', 'craigslist');
CREATE TYPE listing_status AS ENUM ('draft', 'ready', 'posted', 'sold');

-- Items table
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  brief_description TEXT NOT NULL,
  condition item_condition NOT NULL,
  images TEXT[] NOT NULL DEFAULT '{}',
  category TEXT
);

-- Listings table
CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID REFERENCES items(id) ON DELETE CASCADE NOT NULL,
  platform platform NOT NULL,
  generated_description TEXT NOT NULL,
  suggested_price DECIMAL(10, 2) NOT NULL,
  actual_price DECIMAL(10, 2),
  status listing_status DEFAULT 'draft' NOT NULL,
  posted_at TIMESTAMPTZ,
  sold_at TIMESTAMPTZ,
  platform_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Ensure one listing per platform per item
  UNIQUE(item_id, platform)
);

-- Create indexes for common queries
CREATE INDEX idx_items_created_at ON items(created_at DESC);
CREATE INDEX idx_listings_item_id ON listings(item_id);
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_platform ON listings(platform);
CREATE INDEX idx_listings_posted_at ON listings(posted_at DESC);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER items_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER listings_updated_at
  BEFORE UPDATE ON listings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Row Level Security (enable when you add auth)
-- ALTER TABLE items ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

-- Storage bucket for images (run in Supabase dashboard or via API)
-- Create a bucket called 'item-images' with public access

-- Sample RLS policies for when you add auth:
-- CREATE POLICY "Users can view own items" ON items
--   FOR SELECT USING (auth.uid() = user_id);
-- CREATE POLICY "Users can insert own items" ON items
--   FOR INSERT WITH CHECK (auth.uid() = user_id);
-- CREATE POLICY "Users can update own items" ON items
--   FOR UPDATE USING (auth.uid() = user_id);
-- CREATE POLICY "Users can delete own items" ON items
--   FOR DELETE USING (auth.uid() = user_id);
