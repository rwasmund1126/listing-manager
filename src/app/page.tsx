'use client'

import { useState, useEffect } from 'react'
import { Plus, Package, TrendingDown, Clock, CheckCircle2, Settings, type LucideIcon } from 'lucide-react'
import { supabase, getImageUrl } from '@/lib/supabase'
import type { ItemWithListings } from '@/lib/database.types'
import { platformLabels, conditionLabels } from '@/lib/database.types'
import { formatDistanceToNow, differenceInDays } from 'date-fns'
import Link from 'next/link'
import Image from 'next/image'

export default function Dashboard() {
  const [items, setItems] = useState<ItemWithListings[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'sold'>('all')

  useEffect(() => {
    fetchItems()
  }, [])

  async function fetchItems() {
    setLoading(true)
    try {
      const { data: itemsData, error: itemsError } = await supabase
        .from('items')
        .select('*')
        .order('created_at', { ascending: false })

      if (itemsError) throw itemsError

      const { data: listingsData, error: listingsError } = await supabase
        .from('listings')
        .select('*')

      if (listingsError) throw listingsError

      // Combine items with their listings
      const itemsWithListings: ItemWithListings[] = (itemsData || []).map(item => ({
        ...item,
        listings: (listingsData || []).filter(l => l.item_id === item.id)
      }))

      setItems(itemsWithListings)
    } catch (error) {
      console.error('Error fetching items:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredItems = items.filter(item => {
    if (filter === 'all') return true
    if (filter === 'active') return item.listings.some(l => l.status === 'posted')
    if (filter === 'sold') return item.listings.every(l => l.status === 'sold')
    return true
  })

  const stats = {
    total: items.length,
    active: items.filter(i => i.listings.some(l => l.status === 'posted')).length,
    sold: items.filter(i => i.listings.every(l => l.status === 'sold') && i.listings.length > 0).length,
    needsAttention: items.filter(i => {
      const postedListings = i.listings.filter(l => l.status === 'posted')
      return postedListings.some(l => l.posted_at && differenceInDays(new Date(), new Date(l.posted_at)) >= 7)
    }).length,
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl text-ink">Listing Manager</h1>
          <p className="text-muted mt-1">Track and optimize your marketplace listings</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/settings" className="btn-ghost" title="Settings">
            <Settings size={18} />
          </Link>
          <Link href="/items/new" className="btn-primary">
            <Plus size={18} />
            New Item
          </Link>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Package} label="Total Items" value={stats.total} />
        <StatCard icon={Clock} label="Active Listings" value={stats.active} variant="blue" />
        <StatCard icon={CheckCircle2} label="Sold" value={stats.sold} variant="green" />
        <StatCard icon={TrendingDown} label="Needs Attention" value={stats.needsAttention} variant="amber" />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {(['all', 'active', 'sold'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-ink text-canvas'
                : 'text-muted hover:text-ink hover:bg-ink/5'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Items grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="aspect-square bg-border rounded-lg mb-4" />
              <div className="h-4 bg-border rounded w-3/4 mb-2" />
              <div className="h-3 bg-border rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  variant = 'default'
}: {
  icon: LucideIcon
  label: string
  value: number
  variant?: 'default' | 'blue' | 'green' | 'amber'
}) {
  const variants = {
    default: 'bg-surface',
    blue: 'bg-blue-50',
    green: 'bg-green-50',
    amber: 'bg-amber-50',
  }
  
  const iconVariants = {
    default: 'text-muted',
    blue: 'text-blue-600',
    green: 'text-green-600',
    amber: 'text-amber-600',
  }

  return (
    <div className={`card p-4 ${variants[variant]}`}>
      <div className="flex items-center gap-3">
        <Icon size={20} className={iconVariants[variant]} />
        <div>
          <p className="text-2xl font-display text-ink">{value}</p>
          <p className="text-sm text-muted">{label}</p>
        </div>
      </div>
    </div>
  )
}

function ItemCard({ item }: { item: ItemWithListings }) {
  const postedListings = item.listings.filter(l => l.status === 'posted')
  const oldestPosted = postedListings.length > 0
    ? postedListings.reduce((oldest, l) => {
        if (!l.posted_at) return oldest
        if (!oldest.posted_at) return l
        return new Date(l.posted_at) < new Date(oldest.posted_at) ? l : oldest
      })
    : null
  
  const daysSincePosted = oldestPosted?.posted_at 
    ? differenceInDays(new Date(), new Date(oldestPosted.posted_at))
    : null
  
  const needsAttention = daysSincePosted !== null && daysSincePosted >= 7
  const imageUrl = item.images[0] ? getImageUrl(item.images[0]) : null

  return (
    <Link href={`/items/${item.id}`} className="card-interactive p-4 block">
      {/* Image */}
      <div className="aspect-square bg-border/50 rounded-lg mb-4 overflow-hidden relative">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={item.brief_description}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted">
            <Package size={32} />
          </div>
        )}
        {needsAttention && (
          <div className="absolute top-2 right-2 bg-amber-500 text-white text-xs px-2 py-1 rounded-full font-medium">
            {daysSincePosted}+ days
          </div>
        )}
      </div>

      {/* Content */}
      <h3 className="font-medium text-ink line-clamp-2 mb-2">{item.brief_description}</h3>
      
      <div className="flex items-center gap-2 text-sm text-muted mb-3">
        <span>{conditionLabels[item.condition]}</span>
        <span>•</span>
        <span>{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</span>
      </div>

      {/* Platform badges */}
      <div className="flex flex-wrap gap-1.5">
        {item.listings.map((listing) => (
          <span
            key={listing.id}
            className={`badge-${listing.platform}`}
          >
            {platformLabels[listing.platform].split(' ')[0]}
            {listing.status === 'sold' && ' ✓'}
          </span>
        ))}
        {item.listings.length === 0 && (
          <span className="badge bg-border text-muted">No listings yet</span>
        )}
      </div>
    </Link>
  )
}

function EmptyState({ filter }: { filter: string }) {
  return (
    <div className="card p-12 text-center">
      <Package size={48} className="mx-auto text-border mb-4" />
      <h3 className="font-display text-xl text-ink mb-2">
        {filter === 'all' ? 'No items yet' : `No ${filter} items`}
      </h3>
      <p className="text-muted mb-6">
        {filter === 'all' 
          ? 'Add your first item to start selling'
          : 'Items will appear here when they match this filter'}
      </p>
      {filter === 'all' && (
        <Link href="/items/new" className="btn-primary">
          <Plus size={18} />
          Add First Item
        </Link>
      )}
    </div>
  )
}
