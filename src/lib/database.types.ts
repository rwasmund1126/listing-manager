export type ItemCondition = 'new_with_tags' | 'like_new' | 'good' | 'fair'
export type Platform = 'ebay' | 'facebook' | 'craigslist'
export type ListingStatus = 'draft' | 'ready' | 'posted' | 'sold'
export type ListingFormat = 'fixed_price' | 'auction'
export type AuctionDuration = 3 | 5 | 7 | 10

export interface Item {
  id: string
  created_at: string
  updated_at: string
  brief_description: string
  condition: ItemCondition
  images: string[] // Array of storage paths
  category?: string
  // Shipping dimensions for calculated shipping
  weight_oz?: number
  length_in?: number
  width_in?: number
  height_in?: number
}

export interface Listing {
  id: string
  item_id: string
  platform: Platform
  generated_description: string
  suggested_price: number
  actual_price?: number
  status: ListingStatus
  posted_at?: string
  sold_at?: string
  platform_url?: string
  created_at: string
  updated_at: string
  // eBay-specific fields
  ebay_listing_id?: string
  listing_format?: ListingFormat
  auction_duration?: AuctionDuration
  starting_bid?: number
  ebay_category_id?: string
  ebay_category_name?: string
}

export interface EbayTokens {
  id: string
  access_token: string
  refresh_token: string
  expires_at: string
  refresh_token_expires_at: string
  scopes: string[]
  created_at: string
  updated_at: string
}

export interface ItemWithListings extends Item {
  listings: Listing[]
}

// Database schema for Supabase
export interface Database {
  public: {
    Tables: {
      items: {
        Row: Item
        Insert: Omit<Item, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Item, 'id' | 'created_at'>>
        Relationships: []
      }
      listings: {
        Row: Listing
        Insert: Omit<Listing, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Listing, 'id' | 'created_at'>>
        Relationships: [
          {
            foreignKeyName: 'listings_item_id_fkey'
            columns: ['item_id']
            isOneToOne: false
            referencedRelation: 'items'
            referencedColumns: ['id']
          }
        ]
      }
      ebay_tokens: {
        Row: EbayTokens
        Insert: Omit<EbayTokens, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<EbayTokens, 'id' | 'created_at'>>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// UI-friendly labels
export const conditionLabels: Record<ItemCondition, string> = {
  new_with_tags: 'New with Tags',
  like_new: 'Like New',
  good: 'Good',
  fair: 'Fair',
}

export const platformLabels: Record<Platform, string> = {
  ebay: 'eBay',
  facebook: 'Facebook Marketplace',
  craigslist: 'Craigslist',
}

export const statusLabels: Record<ListingStatus, string> = {
  draft: 'Draft',
  ready: 'Ready to Post',
  posted: 'Posted',
  sold: 'Sold',
}

export const listingFormatLabels: Record<ListingFormat, string> = {
  fixed_price: 'Buy It Now',
  auction: 'Auction',
}

export const auctionDurationLabels: Record<AuctionDuration, string> = {
  3: '3 days',
  5: '5 days',
  7: '7 days',
  10: '10 days',
}
