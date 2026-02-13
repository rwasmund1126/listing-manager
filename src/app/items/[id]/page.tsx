'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
  Upload,
  Search,
  Sparkles,
  Pencil,
  Loader2,
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
    categoryName: '',
    format: 'FIXED_PRICE' as 'FIXED_PRICE' | 'AUCTION',
    price: 0,
    duration: 'DAYS_7' as 'DAYS_3' | 'DAYS_5' | 'DAYS_7' | 'DAYS_10' | 'GTC',
    startingBid: 0,
  })

  // Category search state
  const [categorySearch, setCategorySearch] = useState('')
  const [categoryResults, setCategoryResults] = useState<Array<{ categoryId: string; categoryName: string; breadcrumb: string }>>([])
  const [categorySearching, setCategorySearching] = useState(false)
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const categorySearchTimeout = useRef<NodeJS.Timeout | null>(null)

  // AI category prediction state
  const [categoryPredictions, setCategoryPredictions] = useState<Array<{ categoryId: string; categoryName: string; confidence: number }>>([])
  const [predictionsLoading, setPredictionsLoading] = useState(false)

  // Edit modal state
  const [editModalListing, setEditModalListing] = useState<Listing | null>(null)
  const [editForm, setEditForm] = useState({ price: 0, description: '' })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

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

  const searchCategories = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setCategoryResults([])
      setShowCategoryDropdown(false)
      return
    }
    setCategorySearching(true)
    try {
      const res = await fetch(`/api/ebay/category-suggestions?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      if (res.ok) {
        setCategoryResults(data.suggestions || [])
        setShowCategoryDropdown(true)
      }
    } catch (err) {
      console.error('Category search error:', err)
    } finally {
      setCategorySearching(false)
    }
  }, [])

  const handleCategorySearchChange = (value: string) => {
    setCategorySearch(value)
    if (categorySearchTimeout.current) clearTimeout(categorySearchTimeout.current)
    categorySearchTimeout.current = setTimeout(() => searchCategories(value), 300)
  }

  const selectCategory = (categoryId: string, categoryName: string) => {
    setEbayForm({ ...ebayForm, categoryId, categoryName })
    setCategorySearch('')
    setShowCategoryDropdown(false)
  }

  const fetchPredictions = async (description: string, condition: string) => {
    setPredictionsLoading(true)
    try {
      const res = await fetch('/api/predict-category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, condition }),
      })
      const data = await res.json()
      if (res.ok) {
        setCategoryPredictions(data.predictions || [])
      }
    } catch (err) {
      console.error('Category prediction error:', err)
    } finally {
      setPredictionsLoading(false)
    }
  }

  const openEbayModal = (listing: Listing) => {
    setEbayModalListing(listing)
    setEbayForm({
      ...ebayForm,
      categoryId: '',
      categoryName: '',
      price: listing.suggested_price,
    })
    setEbayError(null)
    setCategorySearch('')
    setCategoryResults([])
    setCategoryPredictions([])
    // Fetch AI predictions
    if (item) {
      fetchPredictions(item.brief_description, item.condition)
    }
  }

  const closeEbayModal = () => {
    setEbayModalListing(null)
    setEbayError(null)
    setCategoryPredictions([])
  }

  const openEditModal = (listing: Listing) => {
    setEditModalListing(listing)
    setEditForm({
      price: listing.suggested_price,
      description: listing.generated_description,
    })
    setEditError(null)
  }

  const closeEditModal = () => {
    setEditModalListing(null)
    setEditError(null)
  }

  const saveEditToEbay = async () => {
    if (!editModalListing) return
    setEditSaving(true)
    setEditError(null)

    try {
      const response = await fetch('/api/ebay/update-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: editModalListing.id,
          price: editForm.price,
          description: editForm.description,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update listing')
      }

      await fetchItem()
      closeEditModal()
    } catch (error) {
      console.error('eBay edit error:', error)
      setEditError(error instanceof Error ? error.message : 'Failed to update listing')
    } finally {
      setEditSaving(false)
    }
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
                  ) : listing.platform === 'ebay' && listing.status === 'posted' && listing.ebay_listing_id ? (
                    <>
                      <button
                        onClick={() => openEditModal(listing)}
                        className="btn-secondary"
                      >
                        <Pencil size={16} />
                        Edit
                      </button>
                      <button
                        onClick={() => window.open(`https://www.ebay.com/itm/${listing.ebay_listing_id}`, '_blank')}
                        className="btn-primary flex-1"
                      >
                        View on eBay
                        <ExternalLink size={16} />
                      </button>
                    </>
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
              {/* AI Category Predictions */}
              {(predictionsLoading || categoryPredictions.length > 0) && (
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">
                    <Sparkles size={14} className="inline mr-1" />
                    AI Suggested Categories
                  </label>
                  {predictionsLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted">
                      <Loader2 size={14} className="animate-spin" />
                      Analyzing item...
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {categoryPredictions.map((p) => (
                        <button
                          key={p.categoryId}
                          onClick={() => selectCategory(p.categoryId, p.categoryName)}
                          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                            ebayForm.categoryId === p.categoryId
                              ? 'border-accent bg-accent/10 text-accent'
                              : 'border-border hover:border-accent/50 text-muted hover:text-ink'
                          }`}
                        >
                          {p.categoryName}
                          <span className="ml-1 opacity-60">({Math.round(p.confidence * 100)}%)</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Category Search */}
              <div>
                <label className="block text-sm font-medium text-ink mb-1">
                  eBay Category *
                </label>
                {ebayForm.categoryId ? (
                  <div className="flex items-center gap-2 p-2.5 bg-accent/5 border border-accent/20 rounded-lg">
                    <span className="text-sm flex-1">
                      <span className="font-medium text-ink">{ebayForm.categoryName || ebayForm.categoryId}</span>
                      {ebayForm.categoryName && (
                        <span className="text-muted ml-1">#{ebayForm.categoryId}</span>
                      )}
                    </span>
                    <button
                      onClick={() => setEbayForm({ ...ebayForm, categoryId: '', categoryName: '' })}
                      className="text-muted hover:text-ink"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="relative">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                      <input
                        type="text"
                        value={categorySearch}
                        onChange={(e) => handleCategorySearchChange(e.target.value)}
                        onFocus={() => categoryResults.length > 0 && setShowCategoryDropdown(true)}
                        placeholder="Search categories or enter ID..."
                        className="input w-full pl-9"
                      />
                      {categorySearching && (
                        <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted animate-spin" />
                      )}
                    </div>
                    {showCategoryDropdown && categoryResults.length > 0 && (
                      <div className="absolute z-20 w-full mt-1 bg-surface border border-border rounded-lg shadow-card-hover max-h-48 overflow-y-auto">
                        {categoryResults.map((r) => (
                          <button
                            key={r.categoryId}
                            onClick={() => selectCategory(r.categoryId, r.categoryName)}
                            className="w-full px-3 py-2 text-left hover:bg-canvas text-sm border-b border-border last:border-0"
                          >
                            <span className="font-medium text-ink">{r.categoryName}</span>
                            <span className="text-muted ml-1">#{r.categoryId}</span>
                            {r.breadcrumb && (
                              <p className="text-xs text-muted truncate">{r.breadcrumb}</p>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <p className="text-xs text-muted mt-1">
                  Search for a category or enter an ID directly.{' '}
                  <a
                    href="https://www.ebay.com/sellercenter/resources/category-ids"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline"
                  >
                    Browse categories
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
                          duration: e.target.value as 'DAYS_3' | 'DAYS_5' | 'DAYS_7' | 'DAYS_10' | 'GTC',
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

      {/* eBay Edit Modal */}
      {editModalListing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-xl text-ink">Edit eBay Listing</h3>
              <button onClick={closeEditModal} className="btn-ghost p-2">
                <X size={20} />
              </button>
            </div>

            {editError && (
              <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">
                {editError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">$</span>
                  <input
                    type="number"
                    value={editForm.price}
                    onChange={(e) => setEditForm({ ...editForm, price: parseFloat(e.target.value) })}
                    step="0.01"
                    min="0"
                    className="input w-full pl-8"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={8}
                  className="input w-full resize-y"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={closeEditModal} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button
                  onClick={saveEditToEbay}
                  disabled={editSaving}
                  className="btn-primary flex-1"
                >
                  {editSaving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Pencil size={16} />
                      Update on eBay
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
