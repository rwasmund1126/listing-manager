import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForTokens } from '@/lib/ebay'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // Handle error response from eBay
  if (error) {
    console.error('eBay OAuth error:', error, errorDescription)
    const redirectUrl = new URL('/settings', request.url)
    redirectUrl.searchParams.set('ebay', 'error')
    redirectUrl.searchParams.set('message', errorDescription || error)
    return NextResponse.redirect(redirectUrl)
  }

  // Check for authorization code
  if (!code) {
    const redirectUrl = new URL('/settings', request.url)
    redirectUrl.searchParams.set('ebay', 'error')
    redirectUrl.searchParams.set('message', 'No authorization code received')
    return NextResponse.redirect(redirectUrl)
  }

  try {
    // Exchange the code for tokens
    await exchangeCodeForTokens(code)

    // Redirect to settings with success
    const redirectUrl = new URL('/settings', request.url)
    redirectUrl.searchParams.set('ebay', 'connected')
    return NextResponse.redirect(redirectUrl)
  } catch (err) {
    console.error('eBay token exchange error:', err)
    const redirectUrl = new URL('/settings', request.url)
    redirectUrl.searchParams.set('ebay', 'error')
    redirectUrl.searchParams.set('message', err instanceof Error ? err.message : 'Failed to connect eBay account')
    return NextResponse.redirect(redirectUrl)
  }
}
