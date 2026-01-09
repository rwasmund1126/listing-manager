-- eBay Integration Migration
-- Run this in your Supabase SQL editor after the initial schema

-- Create ebay_tokens table for storing OAuth tokens
CREATE TABLE IF NOT EXISTS ebay_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  refresh_token_expires_at TIMESTAMPTZ NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Apply updated_at trigger to ebay_tokens
CREATE TRIGGER ebay_tokens_updated_at
  BEFORE UPDATE ON ebay_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Add eBay-specific columns to listings table
ALTER TABLE listings ADD COLUMN IF NOT EXISTS ebay_listing_id TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS listing_format TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS auction_duration INTEGER;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS starting_bid DECIMAL(10, 2);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS ebay_category_id TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS ebay_category_name TEXT;

-- Add shipping dimensions to items table
ALTER TABLE items ADD COLUMN IF NOT EXISTS weight_oz DECIMAL(8, 2);
ALTER TABLE items ADD COLUMN IF NOT EXISTS length_in DECIMAL(6, 2);
ALTER TABLE items ADD COLUMN IF NOT EXISTS width_in DECIMAL(6, 2);
ALTER TABLE items ADD COLUMN IF NOT EXISTS height_in DECIMAL(6, 2);

-- Create indexes for eBay-specific queries
CREATE INDEX IF NOT EXISTS idx_listings_ebay_listing_id ON listings(ebay_listing_id);
CREATE INDEX IF NOT EXISTS idx_ebay_tokens_expires_at ON ebay_tokens(expires_at);

-- RLS policies for ebay_tokens (allow all for now, similar to other tables)
-- Note: These are permissive policies for local development
-- Tighten these when adding authentication

-- Allow all operations on ebay_tokens
CREATE POLICY "Allow all on ebay_tokens" ON ebay_tokens
  FOR ALL USING (true) WITH CHECK (true);

-- Enable RLS on ebay_tokens (optional, comment out if not using RLS)
-- ALTER TABLE ebay_tokens ENABLE ROW LEVEL SECURITY;

-- Add check constraint for listing_format
ALTER TABLE listings ADD CONSTRAINT chk_listing_format
  CHECK (listing_format IS NULL OR listing_format IN ('fixed_price', 'auction'));

-- Add check constraint for auction_duration
ALTER TABLE listings ADD CONSTRAINT chk_auction_duration
  CHECK (auction_duration IS NULL OR auction_duration IN (3, 5, 7, 10));

COMMENT ON TABLE ebay_tokens IS 'Stores eBay OAuth tokens for API access';
COMMENT ON COLUMN listings.ebay_listing_id IS 'eBay listing ID when posted to eBay';
COMMENT ON COLUMN listings.listing_format IS 'fixed_price or auction';
COMMENT ON COLUMN listings.auction_duration IS 'Auction duration in days (3, 5, 7, or 10)';
COMMENT ON COLUMN items.weight_oz IS 'Package weight in ounces for calculated shipping';
