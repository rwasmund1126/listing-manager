import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { updateInventoryItem, updateOffer } from '@/lib/ebay/listing'
import { EbayNotConnectedError, EbayApiError } from '@/lib/ebay/errors'

interface UpdateListingRequest {
  listingId: string
  price?: number
  description?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: UpdateListingRequest = await request.json()
    const { listingId, price, description } = body

    if (!listingId) {
      return NextResponse.json({ error: 'Missing required field: listingId' }, { status: 400 })
    }

    if (price === undefined && !description) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    // Fetch the listing with eBay identifiers
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('*')
      .eq('id', listingId)
      .single()

    if (listingError || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    if (!listing.ebay_listing_id || !listing.ebay_offer_id || !listing.ebay_sku) {
      return NextResponse.json(
        { error: 'Listing is missing eBay identifiers. It may have been posted before this feature was added.' },
        { status: 400 }
      )
    }

    // Update inventory item if description changed
    if (description) {
      await updateInventoryItem(listing.ebay_sku, {
        title: description.split('\n')[0].substring(0, 80),
        description,
      })
    }

    // Update offer if price changed
    if (price !== undefined) {
      await updateOffer(listing.ebay_offer_id, { price, description })
    }

    // Update our database
    const dbUpdates: Record<string, unknown> = {}
    if (price !== undefined) dbUpdates.suggested_price = price
    if (description) dbUpdates.generated_description = description

    const { error: updateError } = await supabase
      .from('listings')
      .update(dbUpdates)
      .eq('id', listingId)

    if (updateError) {
      console.error('Failed to update listing in database:', updateError)
    }

    return NextResponse.json({
      success: true,
      message: 'Listing updated on eBay',
    })
  } catch (error) {
    console.error('eBay update listing error:', error)

    if (error instanceof EbayNotConnectedError) {
      return NextResponse.json(
        { error: 'eBay account not connected. Please reconnect in settings.' },
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
      { error: error instanceof Error ? error.message : 'Failed to update listing' },
      { status: 500 }
    )
  }
}
