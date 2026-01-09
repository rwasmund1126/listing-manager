// eBay API client with retry logic and error handling

import { getEbayConfig, EBAY_MARKETPLACE_ID } from './config'
import { getValidAccessToken } from './auth'
import { EbayApiError, EbayRateLimitError, parseEbayError } from './errors'

interface RequestOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>
}

// Sleep helper for retry delays
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Make an authenticated request to eBay API with retry logic
export async function ebayRequest<T>(
  endpoint: string,
  options: RequestOptions = {},
  retries = 3
): Promise<T> {
  const config = getEbayConfig()
  const accessToken = await getValidAccessToken()

  const url = endpoint.startsWith('http') ? endpoint : `${config.apiBaseUrl}${endpoint}`

  const defaultHeaders: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'X-EBAY-C-MARKETPLACE-ID': EBAY_MARKETPLACE_ID,
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
      })

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10)
        if (attempt < retries) {
          await sleep(retryAfter * 1000)
          continue
        }
        throw new EbayRateLimitError(retryAfter)
      }

      // Handle success with no content
      if (response.status === 204) {
        return {} as T
      }

      const data = await response.json()

      if (!response.ok) {
        throw parseEbayError(data, response.status)
      }

      return data as T
    } catch (error) {
      // Don't retry auth errors or API errors
      if (error instanceof EbayApiError || error instanceof EbayRateLimitError) {
        throw error
      }

      // Retry network errors with exponential backoff
      if (attempt === retries) {
        throw error
      }

      await sleep(Math.pow(2, attempt) * 1000)
    }
  }

  throw new Error('Max retries exceeded')
}

// GET request helper
export async function ebayGet<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  let url = endpoint
  if (params) {
    const searchParams = new URLSearchParams(params)
    url = `${endpoint}?${searchParams.toString()}`
  }
  return ebayRequest<T>(url, { method: 'GET' })
}

// POST request helper
export async function ebayPost<T>(endpoint: string, body?: unknown): Promise<T> {
  return ebayRequest<T>(endpoint, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  })
}

// PUT request helper
export async function ebayPut<T>(endpoint: string, body?: unknown): Promise<T> {
  return ebayRequest<T>(endpoint, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  })
}

// DELETE request helper
export async function ebayDelete<T>(endpoint: string): Promise<T> {
  return ebayRequest<T>(endpoint, { method: 'DELETE' })
}
