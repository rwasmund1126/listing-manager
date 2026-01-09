import { NextResponse } from 'next/server'
import { deleteTokens } from '@/lib/ebay'

export async function POST() {
  try {
    await deleteTokens()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('eBay disconnect error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to disconnect eBay account' },
      { status: 500 }
    )
  }
}
