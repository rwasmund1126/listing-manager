'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Check, AlertCircle, ExternalLink, Loader2 } from 'lucide-react'

interface EbayStatus {
  configured: boolean
  connected: boolean
  expiresAt?: string
  needsReauth: boolean
  error?: string
}

// Wrapper component that handles search params
function SettingsContent() {
  const searchParams = useSearchParams()
  const [ebayStatus, setEbayStatus] = useState<EbayStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchEbayStatus()

    // Handle redirect from OAuth callback
    const ebayParam = searchParams.get('ebay')
    const messageParam = searchParams.get('message')

    if (ebayParam === 'connected') {
      setMessage({ type: 'success', text: 'Successfully connected your eBay account!' })
    } else if (ebayParam === 'error') {
      setMessage({ type: 'error', text: messageParam || 'Failed to connect eBay account' })
    }
  }, [searchParams])

  async function fetchEbayStatus() {
    try {
      const response = await fetch('/api/ebay/status')
      const data = await response.json()
      setEbayStatus(data)
    } catch (error) {
      console.error('Failed to fetch eBay status:', error)
      setEbayStatus({
        configured: false,
        connected: false,
        needsReauth: false,
        error: 'Failed to check status',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleDisconnect() {
    if (!confirm('Are you sure you want to disconnect your eBay account?')) {
      return
    }

    setDisconnecting(true)
    try {
      const response = await fetch('/api/ebay/disconnect', { method: 'POST' })
      if (response.ok) {
        setMessage({ type: 'success', text: 'eBay account disconnected' })
        setEbayStatus({
          configured: ebayStatus?.configured ?? false,
          connected: false,
          needsReauth: true,
        })
      } else {
        throw new Error('Failed to disconnect')
      }
    } catch (error) {
      console.error('Failed to disconnect:', error)
      setMessage({ type: 'error', text: 'Failed to disconnect eBay account' })
    } finally {
      setDisconnecting(false)
    }
  }

  function handleConnect() {
    // Redirect to eBay OAuth
    window.location.href = '/api/ebay/auth'
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <header className="mb-8">
        <Link href="/" className="btn-ghost mb-4 -ml-4">
          <ArrowLeft size={18} />
          Back to Dashboard
        </Link>
        <h1 className="font-display text-3xl text-ink">Settings</h1>
        <p className="text-muted mt-1">Manage your marketplace connections</p>
      </header>

      {/* Message */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {message.type === 'success' ? <Check size={20} /> : <AlertCircle size={20} />}
          {message.text}
          <button
            onClick={() => setMessage(null)}
            className="ml-auto text-sm underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* eBay Connection */}
      <div className="card p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl text-ink mb-1">eBay Integration</h2>
            <p className="text-muted text-sm">
              Connect your eBay seller account to post listings directly from this app.
            </p>
          </div>
          <div className="badge-ebay text-sm">eBay</div>
        </div>

        <div className="mt-6 pt-6 border-t border-border">
          {loading ? (
            <div className="flex items-center gap-3 text-muted">
              <Loader2 size={20} className="animate-spin" />
              Checking connection status...
            </div>
          ) : !ebayStatus?.configured ? (
            <div className="bg-amber-50 text-amber-700 p-4 rounded-lg">
              <div className="flex items-center gap-2 font-medium mb-2">
                <AlertCircle size={18} />
                Configuration Required
              </div>
              <p className="text-sm mb-3">
                eBay integration requires environment variables to be configured.
                Add the following to your <code className="bg-amber-100 px-1 rounded">.env.local</code> file:
              </p>
              <pre className="text-xs bg-amber-100 p-3 rounded overflow-x-auto">
{`EBAY_CLIENT_ID=your_client_id
EBAY_CLIENT_SECRET=your_client_secret
EBAY_DEV_ID=your_dev_id
EBAY_RU_NAME=your_runame
EBAY_ENVIRONMENT=sandbox`}
              </pre>
              <a
                href="https://developer.ebay.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm mt-3 text-amber-800 hover:underline"
              >
                Get credentials from eBay Developer Portal
                <ExternalLink size={14} />
              </a>
            </div>
          ) : ebayStatus.connected && !ebayStatus.needsReauth ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <Check size={20} />
                <span className="font-medium">Connected to eBay</span>
              </div>
              {ebayStatus.expiresAt && (
                <p className="text-sm text-muted">
                  Access expires: {new Date(ebayStatus.expiresAt).toLocaleString()}
                </p>
              )}
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="btn-secondary text-danger hover:bg-red-50"
              >
                {disconnecting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Disconnecting...
                  </>
                ) : (
                  'Disconnect eBay Account'
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {ebayStatus.needsReauth && ebayStatus.connected && (
                <div className="flex items-center gap-2 text-amber-600 mb-4">
                  <AlertCircle size={18} />
                  <span className="text-sm">Your eBay session has expired. Please reconnect.</span>
                </div>
              )}
              <p className="text-sm text-muted">
                Click the button below to authorize this app with your eBay seller account.
                You&apos;ll be redirected to eBay to grant permission.
              </p>
              <button onClick={handleConnect} className="btn-primary">
                Connect eBay Account
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Additional Info */}
      <div className="mt-6 card p-6">
        <h2 className="font-display text-xl text-ink mb-4">How eBay Posting Works</h2>
        <ol className="space-y-3 text-sm text-muted">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-ink text-canvas flex items-center justify-center text-xs font-medium">
              1
            </span>
            <span>
              <strong className="text-ink">Connect your account</strong> - One-time authorization with eBay
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-ink text-canvas flex items-center justify-center text-xs font-medium">
              2
            </span>
            <span>
              <strong className="text-ink">Create listings as usual</strong> - AI generates descriptions for you
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-ink text-canvas flex items-center justify-center text-xs font-medium">
              3
            </span>
            <span>
              <strong className="text-ink">Post directly to eBay</strong> - Select category and format, then post with one click
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-ink text-canvas flex items-center justify-center text-xs font-medium">
              4
            </span>
            <span>
              <strong className="text-ink">Track from here</strong> - See your eBay listing status and manage everything in one place
            </span>
          </li>
        </ol>
      </div>
    </div>
  )
}

// Main page component with Suspense wrapper
export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="animate-fade-in">
          <header className="mb-8">
            <Link href="/" className="btn-ghost mb-4 -ml-4">
              <ArrowLeft size={18} />
              Back to Dashboard
            </Link>
            <h1 className="font-display text-3xl text-ink">Settings</h1>
            <p className="text-muted mt-1">Manage your marketplace connections</p>
          </header>
          <div className="card p-6">
            <div className="flex items-center gap-3 text-muted">
              <Loader2 size={20} className="animate-spin" />
              Loading settings...
            </div>
          </div>
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  )
}
