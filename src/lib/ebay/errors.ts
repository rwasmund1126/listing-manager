// eBay-specific error types

export class EbayError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EbayError'
  }
}

export class EbayAuthError extends EbayError {
  constructor(
    message: string,
    public code?: string
  ) {
    super(message)
    this.name = 'EbayAuthError'
  }
}

export class EbayApiError extends EbayError {
  constructor(
    message: string,
    public errorId: string,
    public httpStatus: number,
    public errors?: EbayErrorDetail[]
  ) {
    super(message)
    this.name = 'EbayApiError'
  }
}

export class EbayRateLimitError extends EbayError {
  constructor(public retryAfter: number) {
    super(`Rate limited. Retry after ${retryAfter} seconds`)
    this.name = 'EbayRateLimitError'
  }
}

export class EbayNotConnectedError extends EbayError {
  constructor() {
    super('eBay account not connected. Please connect your eBay account in Settings.')
    this.name = 'EbayNotConnectedError'
  }
}

export class EbayTokenExpiredError extends EbayAuthError {
  constructor() {
    super('eBay session expired. Please reconnect your eBay account.', 'token_expired')
    this.name = 'EbayTokenExpiredError'
  }
}

// eBay API error detail structure
export interface EbayErrorDetail {
  errorId: number
  domain: string
  subdomain?: string
  category: string
  message: string
  longMessage?: string
  parameters?: Array<{ name: string; value: string }>
}

// Parse eBay API error response
export function parseEbayError(response: unknown, httpStatus: number): EbayApiError {
  if (typeof response === 'object' && response !== null) {
    const errorResponse = response as Record<string, unknown>

    // Handle standard eBay REST API error format
    if ('errors' in errorResponse && Array.isArray(errorResponse.errors)) {
      const errors = errorResponse.errors as EbayErrorDetail[]
      const primaryError = errors[0]
      return new EbayApiError(
        primaryError?.message || 'Unknown eBay API error',
        String(primaryError?.errorId || 'unknown'),
        httpStatus,
        errors
      )
    }

    // Handle OAuth error format
    if ('error' in errorResponse) {
      return new EbayApiError(
        String(errorResponse.error_description || errorResponse.error),
        String(errorResponse.error),
        httpStatus
      )
    }
  }

  return new EbayApiError('Unknown eBay API error', 'unknown', httpStatus)
}

// User-friendly error messages
export function getEbayErrorMessage(error: unknown): string {
  if (error instanceof EbayNotConnectedError) {
    return 'Please connect your eBay account in Settings to post listings.'
  }

  if (error instanceof EbayTokenExpiredError) {
    return 'Your eBay session has expired. Please reconnect your account.'
  }

  if (error instanceof EbayRateLimitError) {
    return `eBay is temporarily limiting requests. Please wait ${error.retryAfter} seconds and try again.`
  }

  if (error instanceof EbayApiError) {
    // Map common error IDs to user-friendly messages
    switch (error.errorId) {
      case '25002':
        return 'This item is already listed on eBay.'
      case '25014':
        return 'Please select a valid eBay category.'
      case '25710':
        return 'eBay requires at least one image for listings.'
      default:
        return error.message
    }
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'An unexpected error occurred with eBay.'
}
