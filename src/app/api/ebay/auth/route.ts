import { NextResponse } from 'next/server'
import { buildAuthUrl, isEbayConfigured } from '@/lib/ebay'

export async function GET() {
  // Check if eBay is configured
  if (!isEbayConfigured()) {
    return NextResponse.json(
      { error: 'eBay integration is not configured. Please add eBay credentials to environment variables.' },
      { status: 500 }
    )
  }

  try {
    const authUrl = buildAuthUrl()
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('eBay auth error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initiate eBay authorization' },
      { status: 500 }
    )
  }
}
