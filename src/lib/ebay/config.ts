// eBay API Configuration

export type EbayEnvironment = 'sandbox' | 'production'

export interface EbayConfig {
  clientId: string
  clientSecret: string
  devId: string
  ruName: string
  environment: EbayEnvironment
  apiBaseUrl: string
  authBaseUrl: string
  scopes: string[]
}

function getEnvironment(): EbayEnvironment {
  const env = process.env.EBAY_ENVIRONMENT || 'sandbox'
  if (env !== 'sandbox' && env !== 'production') {
    console.warn(`Invalid EBAY_ENVIRONMENT "${env}", defaulting to sandbox`)
    return 'sandbox'
  }
  return env
}

function getApiBaseUrl(environment: EbayEnvironment): string {
  return environment === 'production'
    ? 'https://api.ebay.com'
    : 'https://api.sandbox.ebay.com'
}

function getAuthBaseUrl(environment: EbayEnvironment): string {
  return environment === 'production'
    ? 'https://auth.ebay.com'
    : 'https://auth.sandbox.ebay.com'
}

// Required OAuth scopes for listing management
const EBAY_SCOPES = [
  'https://api.ebay.com/oauth/api_scope/sell.inventory',
  'https://api.ebay.com/oauth/api_scope/sell.inventory.readonly',
  'https://api.ebay.com/oauth/api_scope/sell.account',
  'https://api.ebay.com/oauth/api_scope/sell.account.readonly',
  'https://api.ebay.com/oauth/api_scope/sell.fulfillment',
  'https://api.ebay.com/oauth/api_scope/commerce.catalog.readonly',
]

export function getEbayConfig(): EbayConfig {
  const clientId = process.env.EBAY_CLIENT_ID
  const clientSecret = process.env.EBAY_CLIENT_SECRET
  const devId = process.env.EBAY_DEV_ID
  const ruName = process.env.EBAY_RU_NAME

  if (!clientId || !clientSecret || !devId || !ruName) {
    throw new Error(
      'Missing eBay configuration. Required env vars: EBAY_CLIENT_ID, EBAY_CLIENT_SECRET, EBAY_DEV_ID, EBAY_RU_NAME'
    )
  }

  const environment = getEnvironment()

  return {
    clientId,
    clientSecret,
    devId,
    ruName,
    environment,
    apiBaseUrl: getApiBaseUrl(environment),
    authBaseUrl: getAuthBaseUrl(environment),
    scopes: EBAY_SCOPES,
  }
}

export function isEbayConfigured(): boolean {
  return !!(
    process.env.EBAY_CLIENT_ID &&
    process.env.EBAY_CLIENT_SECRET &&
    process.env.EBAY_DEV_ID &&
    process.env.EBAY_RU_NAME
  )
}

// US eBay marketplace ID (most common)
export const EBAY_MARKETPLACE_ID = 'EBAY_US'

// Category tree ID for US eBay
export const EBAY_CATEGORY_TREE_ID = '0'
