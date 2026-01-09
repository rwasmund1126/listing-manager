// eBay OAuth token management

import { supabase } from '../supabase'
import { getEbayConfig } from './config'
import {
  EbayAuthError,
  EbayNotConnectedError,
  EbayTokenExpiredError,
  parseEbayError,
} from './errors'

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

interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  refresh_token_expires_in: number
}

// Build the eBay OAuth authorization URL
export function buildAuthUrl(): string {
  const config = getEbayConfig()

  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    redirect_uri: config.ruName,
    scope: config.scopes.join(' '),
  })

  return `${config.authBaseUrl}/oauth2/authorize?${params.toString()}`
}

// Exchange authorization code for tokens
export async function exchangeCodeForTokens(code: string): Promise<EbayTokens> {
  const config = getEbayConfig()

  const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')

  const response = await fetch(`${config.apiBaseUrl}/identity/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.ruName,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw parseEbayError(error, response.status)
  }

  const tokenResponse: TokenResponse = await response.json()
  return await storeTokens(tokenResponse, config.scopes)
}

// Refresh the access token using refresh token
export async function refreshAccessToken(refreshToken: string): Promise<EbayTokens> {
  const config = getEbayConfig()

  const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')

  const response = await fetch(`${config.apiBaseUrl}/identity/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      scope: config.scopes.join(' '),
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    // If refresh token is invalid/expired, user needs to reconnect
    if (response.status === 400 || response.status === 401) {
      throw new EbayTokenExpiredError()
    }
    throw parseEbayError(error, response.status)
  }

  const tokenResponse: TokenResponse = await response.json()
  return await storeTokens(tokenResponse, config.scopes)
}

// Store tokens in database
async function storeTokens(tokenResponse: TokenResponse, scopes: string[]): Promise<EbayTokens> {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + tokenResponse.expires_in * 1000)
  const refreshExpiresAt = new Date(now.getTime() + tokenResponse.refresh_token_expires_in * 1000)

  const tokenData = {
    access_token: tokenResponse.access_token,
    refresh_token: tokenResponse.refresh_token,
    expires_at: expiresAt.toISOString(),
    refresh_token_expires_at: refreshExpiresAt.toISOString(),
    scopes,
    updated_at: now.toISOString(),
  }

  // Check if tokens already exist
  const { data: existing } = await supabase.from('ebay_tokens').select('id').limit(1).single()

  let result
  if (existing) {
    // Update existing tokens
    result = await supabase
      .from('ebay_tokens')
      .update(tokenData)
      .eq('id', existing.id)
      .select()
      .single()
  } else {
    // Insert new tokens
    result = await supabase.from('ebay_tokens').insert(tokenData).select().single()
  }

  if (result.error) {
    throw new EbayAuthError(`Failed to store tokens: ${result.error.message}`)
  }

  return result.data as EbayTokens
}

// Get stored tokens from database
export async function getStoredTokens(): Promise<EbayTokens | null> {
  const { data, error } = await supabase.from('ebay_tokens').select('*').limit(1).single()

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows found
      return null
    }
    throw new EbayAuthError(`Failed to retrieve tokens: ${error.message}`)
  }

  return data as EbayTokens
}

// Get a valid access token, refreshing if necessary
export async function getValidAccessToken(): Promise<string> {
  const tokens = await getStoredTokens()

  if (!tokens) {
    throw new EbayNotConnectedError()
  }

  const now = new Date()
  const expiresAt = new Date(tokens.expires_at)
  const refreshExpiresAt = new Date(tokens.refresh_token_expires_at)

  // Check if refresh token is expired
  if (refreshExpiresAt <= now) {
    throw new EbayTokenExpiredError()
  }

  // Check if access token is expired (with 5-minute buffer)
  const bufferMs = 5 * 60 * 1000
  if (expiresAt.getTime() - bufferMs <= now.getTime()) {
    // Refresh the token
    const newTokens = await refreshAccessToken(tokens.refresh_token)
    return newTokens.access_token
  }

  return tokens.access_token
}

// Delete stored tokens (disconnect eBay account)
export async function deleteTokens(): Promise<void> {
  const { error } = await supabase.from('ebay_tokens').delete().neq('id', '')

  if (error) {
    throw new EbayAuthError(`Failed to delete tokens: ${error.message}`)
  }
}

// Check if eBay account is connected and tokens are valid
export async function getConnectionStatus(): Promise<{
  connected: boolean
  expiresAt?: string
  needsReauth: boolean
}> {
  const tokens = await getStoredTokens()

  if (!tokens) {
    return { connected: false, needsReauth: true }
  }

  const now = new Date()
  const refreshExpiresAt = new Date(tokens.refresh_token_expires_at)
  const needsReauth = refreshExpiresAt <= now

  return {
    connected: true,
    expiresAt: tokens.expires_at,
    needsReauth,
  }
}
