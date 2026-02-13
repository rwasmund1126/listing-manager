-- Add columns needed for editing eBay listings
-- ebay_offer_id: tracks the eBay offer for updates
-- ebay_sku: tracks the inventory item SKU for updates

ALTER TABLE listings ADD COLUMN IF NOT EXISTS ebay_offer_id TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS ebay_sku TEXT;
