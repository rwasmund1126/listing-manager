// eBay Inventory API helpers for creating and publishing listings

import { ebayPost, ebayPut } from './client'
import { EBAY_MARKETPLACE_ID } from './config'

export interface EbayListingParams {
  sku: string
  title: string
  description: string
  condition: 'NEW' | 'LIKE_NEW' | 'USED_EXCELLENT' | 'USED_GOOD' | 'USED_ACCEPTABLE'
  price: number
  quantity: number
  categoryId: string
  images: string[]
  format: 'FIXED_PRICE' | 'AUCTION'
  duration?: 'DAYS_3' | 'DAYS_5' | 'DAYS_7' | 'DAYS_10' | 'GTC' // GTC = Good 'Til Cancelled
  startingBid?: number
}

interface InventoryItem {
  sku: string
  product: {
    title: string
    description: string
    imageUrls: string[]
    aspects?: Record<string, string[]>
  }
  condition: string
  availability: {
    shipToLocationAvailability: {
      quantity: number
    }
  }
}

interface Offer {
  sku: string
  marketplaceId: string
  format: string
  availableQuantity: number
  categoryId: string
  listingDescription: string
  listingPolicies: {
    fulfillmentPolicyId?: string
    paymentPolicyId?: string
    returnPolicyId?: string
  }
  pricingSummary: {
    price: {
      value: string
      currency: string
    }
  }
  merchantLocationKey?: string
}

interface AuctionOffer extends Offer {
  listingDuration: string
  bidPrice?: {
    value: string
    currency: string
  }
}

/**
 * Create an inventory item on eBay
 */
export async function createInventoryItem(params: EbayListingParams): Promise<void> {
  const inventoryItem: InventoryItem = {
    sku: params.sku,
    product: {
      title: params.title,
      description: params.description,
      imageUrls: params.images.slice(0, 12), // eBay allows max 12 images
    },
    condition: params.condition,
    availability: {
      shipToLocationAvailability: {
        quantity: params.quantity,
      },
    },
  }

  // Create or update inventory item
  await ebayPut(`/sell/inventory/v1/inventory_item/${encodeURIComponent(params.sku)}`, inventoryItem)
}

/**
 * Create an offer for an inventory item
 */
export async function createOffer(params: EbayListingParams): Promise<{ offerId: string }> {
  const baseOffer: Offer = {
    sku: params.sku,
    marketplaceId: EBAY_MARKETPLACE_ID,
    format: params.format,
    availableQuantity: params.quantity,
    categoryId: params.categoryId,
    listingDescription: params.description,
    listingPolicies: {
      // These can be obtained from the account or created separately
      // For now, we'll let eBay use default policies
    },
    pricingSummary: {
      price: {
        value: params.price.toFixed(2),
        currency: 'USD',
      },
    },
  }

  // Add auction-specific fields if needed
  if (params.format === 'AUCTION') {
    const auctionOffer: AuctionOffer = {
      ...baseOffer,
      listingDuration: params.duration || 'DAYS_7',
    }

    if (params.startingBid) {
      auctionOffer.bidPrice = {
        value: params.startingBid.toFixed(2),
        currency: 'USD',
      }
    }

    return await ebayPost<{ offerId: string }>('/sell/inventory/v1/offer', auctionOffer)
  }

  // For fixed price, set duration to GTC (Good 'Til Cancelled)
  const fixedPriceOffer = {
    ...baseOffer,
    listingDuration: 'GTC',
  }

  return await ebayPost<{ offerId: string }>('/sell/inventory/v1/offer', fixedPriceOffer)
}

/**
 * Publish an offer to eBay
 */
export async function publishOffer(offerId: string): Promise<{ listingId: string }> {
  return await ebayPost<{ listingId: string }>(`/sell/inventory/v1/offer/${offerId}/publish`)
}

/**
 * Complete workflow: Create inventory item, create offer, and publish
 */
export async function createAndPublishListing(
  params: EbayListingParams
): Promise<{ offerId: string; listingId: string }> {
  // Step 1: Create inventory item
  await createInventoryItem(params)

  // Step 2: Create offer
  const { offerId } = await createOffer(params)

  // Step 3: Publish offer
  const { listingId } = await publishOffer(offerId)

  return { offerId, listingId }
}

/**
 * Map our condition enum to eBay's condition values
 */
export function mapConditionToEbay(
  condition: 'new_with_tags' | 'like_new' | 'good' | 'fair'
): EbayListingParams['condition'] {
  const conditionMap = {
    new_with_tags: 'NEW' as const,
    like_new: 'LIKE_NEW' as const,
    good: 'USED_GOOD' as const,
    fair: 'USED_ACCEPTABLE' as const,
  }

  return conditionMap[condition]
}
