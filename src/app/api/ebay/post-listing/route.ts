import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import {
  createAndPublishListing,
  mapConditionToEbay,
  EbayListingParams,
  EbayNotConnectedError,
  EbayApiError,
} from '@/lib/ebay'

interface PostListingRequest {
  listingId: string
  categoryId: string
  format: 'FIXED_PRICE' | 'AUCTION'
  price?: number // Optional override of suggested price
  duration?: 'DAYS_3' | 'DAYS_5' | 'DAYS_7' | 'DAYS_10' | 'GTC'
  startingBid?: number // For auctions
}

export async function POST(request: NextRequest) {
  try {
    const body: PostListingRequest = await request.json()
    const { listingId, categoryId, format, price, duration, startingBid } = body

    // Validate required fields
    if (!listingId || !categoryId || !format) {
      return NextResponse.json(
        { error: 'Missing required fields: listingId, categoryId, format' },
        { status: 400 }
      )
    }

    // Fetch the listing from database
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select(
        `
        *,
        items (
          id,
          brief_description,
          condition,
          images
        )
      `
      )
      .eq('id', listingId)
      .single()

    if (listingError || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    // Check if already posted to eBay
    if (listing.ebay_listing_id) {
      return NextResponse.json(
        { error: 'Listing already posted to eBay', ebayListingId: listing.ebay_listing_id },
        { status: 400 }
      )
    }

    // Prepare eBay listing parameters
    const item = listing.items
    const sku = `ITEM-${item.id}-${Date.now()}` // Generate unique SKU

    const ebayParams: EbayListingParams = {
      sku,
      title: listing.generated_description.split('\n')[0].substring(0, 80), // First line, max 80 chars
      description: listing.generated_description,
      condition: mapConditionToEbay(item.condition),
      price: price || listing.suggested_price,
      quantity: 1, // Default to 1 for now
      categoryId,
      images: item.images || [],
      format,
      duration: format === 'FIXED_PRICE' ? 'GTC' : duration || 'DAYS_7',
      startingBid: format === 'AUCTION' ? startingBid : undefined,
    }

    // Create and publish on eBay
    const { offerId, listingId: ebayListingId } = await createAndPublishListing(ebayParams)

    // Update database with eBay listing info
    const { error: updateError } = await supabase
      .from('listings')
      .update({
        ebay_listing_id: ebayListingId,
        listing_format: format.toLowerCase(),
        ebay_category_id: categoryId,
        auction_duration: format === 'AUCTION' ? parseInt(duration?.replace('DAYS_', '') || '7') : null,
        starting_bid: startingBid || null,
        status: 'posted',
        posted_at: new Date().toISOString(),
      })
      .eq('id', listingId)

    if (updateError) {
      console.error('Failed to update listing in database:', updateError)
      // Note: Listing is already on eBay at this point
      return NextResponse.json(
        {
          success: true,
          ebayListingId,
          offerId,
          warning: 'Posted to eBay but failed to update database',
        },
        { status: 200 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        ebayListingId,
        offerId,
        message: 'Successfully posted to eBay',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('eBay post listing error:', error)

    if (error instanceof EbayNotConnectedError) {
      return NextResponse.json(
        { error: 'eBay account not connected. Please connect your eBay account in settings.' },
        { status: 401 }
      )
    }

    if (error instanceof EbayApiError) {
      return NextResponse.json(
        { error: `eBay API error: ${error.message}`, errors: error.errors },
        { status: error.httpStatus || 500 }
      )
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to post listing to eBay',
      },
      { status: 500 }
    )
  }
}
