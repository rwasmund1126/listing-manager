import { NextResponse } from 'next/server'
import { getConnectionStatus, isEbayConfigured } from '@/lib/ebay'

export async function GET() {
  // Check if eBay is configured
  if (!isEbayConfigured()) {
    return NextResponse.json({
      configured: false,
      connected: false,
      needsReauth: false,
      message: 'eBay integration is not configured',
    })
  }

  try {
    const status = await getConnectionStatus()
    return NextResponse.json({
      configured: true,
      ...status,
    })
  } catch (error) {
    console.error('eBay status error:', error)
    return NextResponse.json(
      {
        configured: true,
        connected: false,
        needsReauth: true,
        error: error instanceof Error ? error.message : 'Failed to check eBay status',
      },
      { status: 500 }
    )
  }
}
