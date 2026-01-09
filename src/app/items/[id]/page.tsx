'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft,
  ExternalLink,
  Copy,
  CheckCircle,
  Clock,
  TrendingDown,
  Trash2,
  Check,
  MoreVertical,
  X,
  Upload
} from 'lucide-react'
import { supabase, getImageUrl } from '@/lib/supabase'
import type { Item, ItemWithListings, Listing, Platform } from '@/lib/database.types'
import { platformLabels, conditionLabels, statusLabels } from '@/lib/database.types'
import { formatDistanceToNow, differenceInDays, format } from 'date-fns'
import Image from 'next/image'

export default function ItemDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params.id
  const [item, setItem] = useState<ItemWithListings | null>(null)
  const [loading, setLoading] = useState(true)
  const [copiedPlatform, setCopiedPlatform] = useState<Platform | null>(null)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [ebayModalListing, setEbayModalListing] = useState<Listing | null>(null)
  const [ebayPosting, setEbayPosting] = useState(false)
  const [ebayError, setEbayError] = useState<string | null>(null)
  const [ebayForm, setEbayForm] = useState({
    categoryId: '',
    format: 'FIXED_PRICE' as 'FIXED_PRICE' | 'AUCTION',
    price: 0,
    duration: 'DAYS_7' as 'DAYS_3' | 'DAYS_5' | 'DAYS_7' | 'DAYS_10' | 'GTC',
    startingBid: 0,
  })

  const fetchItem = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const { data: itemData, error: itemError } = await supabase
        .from('items')
        .select('*')
        .eq('id', id)
        .single()

      if (itemError || !itemData) throw itemError || new Error('Item not found')

      const { data: listingsData, error: listingsError } = await supabase
        .from('listings')
        .select('*')
        .eq('item_id', id)

      if (listingsError) throw listingsError

      const itemWithListings: ItemWithListings = {
        ...(itemData as Item),
        listings: listingsData || []
      }
      setItem(itemWithListings)
    } catch (error) {
      console.error('Error fetching item:', error)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (id) fetchItem()
  }, [id, fetchItem])

  const copyToClipboard = async (listing: Listing) => {
    const text = listing.generated_description
    await navigator.clipboard.writeText(text)
    setCopiedPlatform(listing.platform)
    setTimeout(() => setCopiedPlatform(null), 2000)
  }

  const markAsPosted = async (listing: Listing) => {
    const { error } = await supabase
      .from('listings')
      .update({ status: 'posted', posted_at: new Date().toISOString() })
      .eq('id', listing.id)

    if (!error) fetchItem()
    setActiveMenu(null)
  }

  const markAsSold = async (listing: Listing) => {
    const { error } = await supabase
      .from('listings')
      .update({ status: 'sold', sold_at: new Date().toISOString() })
      .eq('id', listing.id)

    if (!error) fetchItem()
    setActiveMenu(null)
  }

  const deleteItem = async () => {
    if (!confirm('Are you sure you want to delete this item and all its listings?')) return
    if (!id) return

    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', id)

    if (!error) router.push('/')
  }

  const openEbayModal = (listing: Listing) => {
    setEbayModalListing(listing)
    setEbayForm({
      ...ebayForm,
      price: listing.suggested_price,
    })
    setEbayError(null)
  }

  const closeEbayModal = () => {
    setEbayModalListing(null)
    setEbayError(null)
  }

  const postToEbay = async () => {
    if (!ebayModalListing) return

    if (!ebayForm.categoryId) {
      setEbayError('Please enter an eBay category ID')
      return
    }

    setEbayPosting(true)
    setEbayError(null)

    try {
      const response = await fetch('/api/ebay/post-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: ebayModalListing.id,
          categoryId: ebayForm.categoryId,
          format: ebayForm.format,
          price: ebayForm.price,
          duration: ebayForm.format === 'FIXED_PRICE' ? 'GTC' : ebayForm.duration,
          startingBid: ebayForm.format === 'AUCTION' ? ebayForm.startingBid : undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to post to eBay')
      }

      // Success! Refresh item data and close modal
      await fetchItem()
      closeEbayModal()
    } catch (error) {
      console.error('eBay posting error:', error)
      setEbayError(error instanceof Error ? error.message : 'Failed to post to eBay')
    } finally {
      setEbayPosting(false)
    }
  }

  const getOptimizationSuggestions = (listing: Listing) => {
    const suggestions: string[] = []
    
    if (listing.status === 'posted' && listing.posted_at) {
      const days = differenceInDays(new Date(), new Date(listing.posted_at))
      
      if (days >= 14) {
        suggestions.push('Consider a 15-20% price drop')
        suggestions.push('Relist to appear in fresh searches')
      } else if (days >= 7) {
        suggestions.push('Try a 10% price drop')
        suggestions.push('Update photos or title for visibility')
      } else if (days >= 3) {
        suggestions.push('Share listing to local groups')
      }
    }
    
    return suggestions
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto animate-pulse">
        <div className="h-8 bg-border rounded w-48 mb-8" />
        <div className="card p-6">
          <div className="aspect-video bg-border rounded-lg mb-4" />
          <div className="h-6 bg-border rounded w-3/4 mb-2" />
          <div className="h-4 bg-border rounded w-1/2" />
        </div>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="max-w-3xl mx-auto text-center py-12">
        <p className="text-muted">Item not found</p>
        <button onClick={() => router.push('/')} className="btn-secondary mt-4">
          Go Back
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/')} className="btn-ghost p-2">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-display text-2xl text-ink">Item Details</h1>
        </div>
        <button onClick={deleteItem} className="btn-ghost text-danger">
          <Trash2 size={18} />
        </button>
      </header>

      {/* Item info */}
      <div className="card p-6 mb-6">
        <div className="flex gap-6">
          {/* Images */}
          <div className="flex gap-2 flex-shrink-0">
            {item.images.map((img, i) => (
              <div key={i} className="w-24 h-24 rounded-lg overflow-hidden relative bg-border">
                <Image
                  src={getImageUrl(img)}
                  alt=""
                  fill
                  className="object-cover"
                />
              </div>
            ))}
          </div>

          {/* Details */}
          <div className="flex-1">
            <h2 className="font-medium text-lg text-ink mb-2">{item.brief_description}</h2>
            <div className="flex flex-wrap gap-3 text-sm text-muted">
              <span className="flex items-center gap-1.5">
                <Clock size={14} />
                Added {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
              </span>
              <span>•</span>
              <span>{conditionLabels[item.condition]}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Listings */}
      <h3 className="font-display text-lg text-ink mb-4">Listings</h3>
      <div className="space-y-4">
        {item.listings.map((listing) => {
          const suggestions = getOptimizationSuggestions(listing)
          const daysSincePosted = listing.posted_at 
            ? differenceInDays(new Date(), new Date(listing.posted_at))
            : null

          return (
            <div key={listing.id} className="card p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className={`badge-${listing.platform}`}>
                    {platformLabels[listing.platform]}
                  </span>
                  <span className={`badge ${
                    listing.status === 'sold' ? 'badge-success' :
                    listing.status === 'posted' ? 'badge-warning' :
                    'bg-border text-muted'
                  }`}>
                    {statusLabels[listing.status]}
                  </span>
                  {daysSincePosted !== null && listing.status === 'posted' && (
                    <span className="text-sm text-muted">
                      {daysSincePosted} days posted
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-xl text-ink">
                    ${listing.suggested_price}
                  </span>
                  <div className="relative">
                    <button
                      onClick={() => setActiveMenu(activeMenu === listing.id ? null : listing.id)}
                      className="btn-ghost p-2"
                    >
                      <MoreVertical size={16} />
                    </button>
                    {activeMenu === listing.id && (
                      <div className="absolute right-0 top-full mt-1 bg-surface border border-border rounded-lg shadow-card-hover py-1 z-10 min-w-[160px]">
                        {listing.status === 'ready' && (
                          <button
                            onClick={() => markAsPosted(listing)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-canvas flex items-center gap-2"
                          >
                            <Check size={14} />
                            Mark as Posted
                          </button>
                        )}
                        {listing.status === 'posted' && (
                          <button
                            onClick={() => markAsSold(listing)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-canvas flex items-center gap-2"
                          >
                            <CheckCircle size={14} />
                            Mark as Sold
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-muted text-sm whitespace-pre-wrap mb-4">
                {listing.generated_description}
              </p>

              {/* Optimization suggestions */}
              {suggestions.length > 0 && listing.status === 'posted' && (
                <div className="bg-amber-50 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <TrendingDown size={16} className="text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm text-amber-800 mb-1">
                        Optimization Suggestions
                      </p>
                      <ul className="text-sm text-amber-700 space-y-1">
                        {suggestions.map((s, i) => (
                          <li key={i}>• {s}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              {listing.status !== 'sold' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => copyToClipboard(listing)}
                    className="btn-secondary flex-1"
                  >
                    {copiedPlatform === listing.platform ? (
                      <>
                        <CheckCircle size={16} />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy size={16} />
                        Copy Description
                      </>
                    )}
                  </button>
                  {listing.platform === 'ebay' && listing.status === 'ready' && !listing.ebay_listing_id ? (
                    <button
                      onClick={() => openEbayModal(listing)}
                      className="btn-primary flex-1"
                    >
                      <Upload size={16} />
                      Post to eBay
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        const urls: Record<Platform, string> = {
                          ebay: listing.ebay_listing_id
                            ? `https://www.ebay.com/itm/${listing.ebay_listing_id}`
                            : 'https://www.ebay.com/sl/sell',
                          facebook: 'https://www.facebook.com/marketplace/create/item',
                          craigslist: 'https://post.craigslist.org/',
                        }
                        window.open(urls[listing.platform], '_blank')
                      }}
                      className="btn-primary flex-1"
                    >
                      {listing.status === 'ready' ? 'Post' : 'View'} on {platformLabels[listing.platform].split(' ')[0]}
                      <ExternalLink size={16} />
                    </button>
                  )}
                </div>
              )}

              {/* Sold info */}
              {listing.status === 'sold' && listing.sold_at && (
                <p className="text-sm text-success flex items-center gap-2">
                  <CheckCircle size={14} />
                  Sold {format(new Date(listing.sold_at), 'MMM d, yyyy')}
                </p>
              )}
            </div>
          )
        })}
      </div>

      {/* eBay Posting Modal */}
      {ebayModalListing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-xl text-ink">Post to eBay</h3>
              <button onClick={closeEbayModal} className="btn-ghost p-2">
                <X size={20} />
              </button>
            </div>

            {/* Error Message */}
            {ebayError && (
              <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">
                {ebayError}
              </div>
            )}

            {/* Form */}
            <div className="space-y-4">
              {/* Category ID */}
              <div>
                <label className="block text-sm font-medium text-ink mb-1">
                  eBay Category ID *
                </label>
                <input
                  type="text"
                  value={ebayForm.categoryId}
                  onChange={(e) => setEbayForm({ ...ebayForm, categoryId: e.target.value })}
                  placeholder="e.g., 15032"
                  className="input w-full"
                />
                <p className="text-xs text-muted mt-1">
                  Find category IDs at{' '}
                  <a
                    href="https://www.ebay.com/sellercenter/resources/category-ids"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline"
                  >
                    eBay Category Browser
                  </a>
                </p>
              </div>

              {/* Listing Format */}
              <div>
                <label className="block text-sm font-medium text-ink mb-1">
                  Listing Format *
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEbayForm({ ...ebayForm, format: 'FIXED_PRICE' })}
                    className={`flex-1 py-2 px-4 rounded-lg border ${
                      ebayForm.format === 'FIXED_PRICE'
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-border hover:border-accent/50'
                    }`}
                  >
                    Fixed Price
                  </button>
                  <button
                    onClick={() => setEbayForm({ ...ebayForm, format: 'AUCTION' })}
                    className={`flex-1 py-2 px-4 rounded-lg border ${
                      ebayForm.format === 'AUCTION'
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-border hover:border-accent/50'
                    }`}
                  >
                    Auction
                  </button>
                </div>
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-ink mb-1">
                  {ebayForm.format === 'FIXED_PRICE' ? 'Price' : 'Buy It Now Price'} *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">$</span>
                  <input
                    type="number"
                    value={ebayForm.price}
                    onChange={(e) => setEbayForm({ ...ebayForm, price: parseFloat(e.target.value) })}
                    step="0.01"
                    min="0"
                    className="input w-full pl-8"
                  />
                </div>
              </div>

              {/* Auction-specific fields */}
              {ebayForm.format === 'AUCTION' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-ink mb-1">
                      Starting Bid *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">$</span>
                      <input
                        type="number"
                        value={ebayForm.startingBid}
                        onChange={(e) =>
                          setEbayForm({ ...ebayForm, startingBid: parseFloat(e.target.value) })
                        }
                        step="0.01"
                        min="0"
                        className="input w-full pl-8"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink mb-1">
                      Duration *
                    </label>
                    <select
                      value={ebayForm.duration}
                      onChange={(e) =>
                        setEbayForm({
                          ...ebayForm,
                          duration: e.target.value as any,
                        })
                      }
                      className="input w-full"
                    >
                      <option value="DAYS_3">3 Days</option>
                      <option value="DAYS_5">5 Days</option>
                      <option value="DAYS_7">7 Days</option>
                      <option value="DAYS_10">10 Days</option>
                    </select>
                  </div>
                </>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button onClick={closeEbayModal} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button
                  onClick={postToEbay}
                  disabled={ebayPosting || !ebayForm.categoryId}
                  className="btn-primary flex-1"
                >
                  {ebayPosting ? (
                    'Posting...'
                  ) : (
                    <>
                      <Upload size={16} />
                      Post to eBay
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
