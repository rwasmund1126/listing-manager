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
  MoreVertical
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
                  <button
                    onClick={() => {
                      const urls: Record<Platform, string> = {
                        ebay: 'https://www.ebay.com/sl/sell',
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
    </div>
  )
}
