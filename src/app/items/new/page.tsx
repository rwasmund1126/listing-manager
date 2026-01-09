'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  ArrowRight, 
  Upload, 
  X, 
  Loader2,
  Sparkles,
  Check,
  ExternalLink,
  Copy,
  CheckCircle
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { ItemCondition, Platform } from '@/lib/database.types'
import { conditionLabels, platformLabels } from '@/lib/database.types'
import Image from 'next/image'

type Step = 'images' | 'details' | 'generate' | 'review'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

// Check if file is HEIC format
function isHeicFile(file: File): boolean {
  return file.type === 'image/heic' || file.type === 'image/heif' ||
         file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')
}

interface GeneratedListing {
  platform: Platform
  description: string
  suggestedPrice: number
  title: string
}

export default function NewItemPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('images')
  const [images, setImages] = useState<File[]>([])
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [briefDescription, setBriefDescription] = useState('')
  const [condition, setCondition] = useState<ItemCondition>('good')
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['ebay', 'facebook', 'craigslist'])
  const [generating, setGenerating] = useState(false)
  const [generatedListings, setGeneratedListings] = useState<GeneratedListing[]>([])
  const [saving, setSaving] = useState(false)
  const [copiedPlatform, setCopiedPlatform] = useState<Platform | null>(null)

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const allFiles = Array.from(e.target.files || [])

    // Check for HEIC files and show helpful message
    const heicFiles = allFiles.filter(isHeicFile)
    if (heicFiles.length > 0) {
      alert(
        `HEIC files are not supported.\n\n` +
        `To convert on Mac:\n` +
        `1. Open the image in Preview\n` +
        `2. File → Export\n` +
        `3. Choose JPEG format\n` +
        `4. Upload the exported file`
      )
      return
    }

    const validFiles = allFiles
      .filter(f => (ALLOWED_TYPES.includes(f.type) || f.type === '') && f.size <= MAX_FILE_SIZE)
    if (validFiles.length === 0) return

    const newImages = [...images, ...validFiles].slice(0, 3)
    setImages(newImages)
    const urls = newImages.map(file => URL.createObjectURL(file))
    setImageUrls(urls)
  }, [images])

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index)
    const newUrls = imageUrls.filter((_, i) => i !== index)
    setImages(newImages)
    setImageUrls(newUrls)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const allFiles = Array.from(e.dataTransfer.files)

    // Check for HEIC files and show helpful message
    const heicFiles = allFiles.filter(isHeicFile)
    if (heicFiles.length > 0) {
      alert(
        `HEIC files are not supported.\n\n` +
        `To convert on Mac:\n` +
        `1. Open the image in Preview\n` +
        `2. File → Export\n` +
        `3. Choose JPEG format\n` +
        `4. Upload the exported file`
      )
      return
    }

    const validFiles = allFiles
      .filter(f => (ALLOWED_TYPES.includes(f.type) || f.type === '') && f.size <= MAX_FILE_SIZE)
    if (validFiles.length === 0) return

    const newImages = [...images, ...validFiles].slice(0, 3)
    setImages(newImages)
    const urls = newImages.map(file => URL.createObjectURL(file))
    setImageUrls(urls)
  }, [images])

  const togglePlatform = (platform: Platform) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    )
  }

  const generateListings = async () => {
    setGenerating(true)
    try {
      const formData = new FormData()
      formData.append('briefDescription', briefDescription)
      formData.append('condition', condition)
      formData.append('platforms', JSON.stringify(selectedPlatforms))
      images.forEach((img, i) => formData.append(`image${i}`, img))

      const response = await fetch('/api/generate-listings', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error('Failed to generate listings')

      const data = await response.json()
      setGeneratedListings(data.listings)
      setStep('review')
    } catch (error) {
      console.error('Error generating listings:', error)
      alert('Failed to generate listings. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  // Sanitize filename to prevent path traversal
  const sanitizeFileName = (name: string): string => {
    // Remove path separators and other dangerous characters
    return name
      .replace(/[/\\]/g, '-')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .substring(0, 100) // Limit length
  }

  const saveAndPost = async () => {
    setSaving(true)
    try {
      // Upload images to Supabase storage
      const imagePaths: string[] = []
      for (const image of images) {
        const safeName = sanitizeFileName(image.name)
        const fileName = `${Date.now()}-${safeName}`
        const { error: uploadError } = await supabase.storage
          .from('item-images')
          .upload(fileName, image)

        if (uploadError) throw uploadError
        imagePaths.push(fileName)
      }

      // Create the item
      const { data: item, error: itemError } = await supabase
        .from('items')
        .insert({
          brief_description: briefDescription,
          condition,
          images: imagePaths,
        })
        .select()
        .single()

      if (itemError) throw itemError

      // Create listings
      const listingsToInsert = generatedListings.map(listing => ({
        item_id: item.id,
        platform: listing.platform,
        generated_description: listing.description,
        suggested_price: listing.suggestedPrice,
        status: 'ready' as const,
      }))

      const { error: listingsError } = await supabase
        .from('listings')
        .insert(listingsToInsert)

      if (listingsError) throw listingsError

      router.push(`/items/${item.id}`)
    } catch (error) {
      console.error('Error saving item:', error)
      const message = error instanceof Error ? error.message : JSON.stringify(error)
      alert(`Failed to save item: ${message}`)
    } finally {
      setSaving(false)
    }
  }

  const copyToClipboard = async (platform: Platform) => {
    const listing = generatedListings.find(l => l.platform === platform)
    if (!listing) return

    const text = `${listing.title}\n\n${listing.description}\n\nPrice: $${listing.suggestedPrice}`
    await navigator.clipboard.writeText(text)
    setCopiedPlatform(platform)
    setTimeout(() => setCopiedPlatform(null), 2000)
  }

  const openPlatformPostPage = (platform: Platform) => {
    const urls: Record<Platform, string> = {
      ebay: 'https://www.ebay.com/sl/sell',
      facebook: 'https://www.facebook.com/marketplace/create/item',
      craigslist: 'https://post.craigslist.org/',
    }
    window.open(urls[platform], '_blank')
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      {/* Header */}
      <header className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="btn-ghost p-2">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="font-display text-2xl text-ink">New Item</h1>
          <p className="text-muted text-sm">
            Step {['images', 'details', 'generate', 'review'].indexOf(step) + 1} of 4
          </p>
        </div>
      </header>

      {/* Progress bar */}
      <div className="flex gap-2 mb-8">
        {(['images', 'details', 'generate', 'review'] as Step[]).map((s, i) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full transition-colors ${
              ['images', 'details', 'generate', 'review'].indexOf(step) >= i
                ? 'bg-ink'
                : 'bg-border'
            }`}
          />
        ))}
      </div>

      {/* Step content */}
      {step === 'images' && (
        <div className="card p-6 animate-slide-up">
          <h2 className="font-display text-xl mb-2">Upload Photos</h2>
          <p className="text-muted mb-6">Add up to 3 photos of your item</p>

          {/* Upload area */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              images.length < 3 ? 'border-border hover:border-ink/30 cursor-pointer' : 'border-border/50'
            }`}
          >
            {images.length < 3 && (
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Upload size={32} className="mx-auto text-muted mb-3" />
                <p className="font-medium text-ink mb-1">Drop images here or click to upload</p>
                <p className="text-sm text-muted">JPEG, PNG, WebP, GIF • {3 - images.length} more allowed</p>
              </label>
            )}
          </div>

          {/* Image previews */}
          {imageUrls.length > 0 && (
            <div className="grid grid-cols-3 gap-4 mt-6">
              {imageUrls.map((url, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-border">
                  <Image src={url} alt="" fill className="object-cover" />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute top-2 right-2 p-1 bg-ink/80 text-canvas rounded-full hover:bg-ink"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end mt-8">
            <button
              onClick={() => setStep('details')}
              disabled={images.length === 0}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {step === 'details' && (
        <div className="card p-6 animate-slide-up">
          <h2 className="font-display text-xl mb-2">Item Details</h2>
          <p className="text-muted mb-6">Describe your item and where you want to list it</p>

          <div className="space-y-6">
            {/* Brief description */}
            <div>
              <label className="label">Brief Description</label>
              <textarea
                value={briefDescription}
                onChange={(e) => setBriefDescription(e.target.value)}
                placeholder="e.g., Nike Air Max toddler shoes, size 6, blue, worn twice"
                className="input min-h-[100px] resize-none"
              />
              <p className="text-xs text-muted mt-1.5">
                Include brand, size, color, and notable details
              </p>
            </div>

            {/* Condition */}
            <div>
              <label className="label">Condition</label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(conditionLabels) as ItemCondition[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCondition(c)}
                    className={`px-4 py-3 rounded-lg border text-left transition-colors ${
                      condition === c
                        ? 'border-ink bg-ink/5'
                        : 'border-border hover:border-ink/30'
                    }`}
                  >
                    <span className="font-medium text-ink">{conditionLabels[c]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Platforms */}
            <div>
              <label className="label">List On</label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(platformLabels) as Platform[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => togglePlatform(p)}
                    className={`px-4 py-2.5 rounded-lg border font-medium transition-all ${
                      selectedPlatforms.includes(p)
                        ? `badge-${p} border-transparent`
                        : 'border-border text-muted hover:border-ink/30'
                    }`}
                  >
                    {selectedPlatforms.includes(p) && <Check size={16} className="inline mr-1.5" />}
                    {platformLabels[p]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-between mt-8">
            <button onClick={() => setStep('images')} className="btn-secondary">
              <ArrowLeft size={18} />
              Back
            </button>
            <button
              onClick={() => setStep('generate')}
              disabled={!briefDescription.trim() || selectedPlatforms.length === 0}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {step === 'generate' && (
        <div className="card p-6 animate-slide-up">
          <h2 className="font-display text-xl mb-2">Generate Listings</h2>
          <p className="text-muted mb-6">
            AI will create optimized descriptions and suggest pricing for each platform
          </p>

          {/* Summary */}
          <div className="bg-canvas rounded-lg p-4 mb-6">
            <div className="flex gap-4">
              {imageUrls[0] && (
                <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 relative">
                  <Image src={imageUrls[0]} alt="" fill className="object-cover" />
                </div>
              )}
              <div>
                <p className="font-medium text-ink mb-1">{briefDescription}</p>
                <p className="text-sm text-muted">
                  {conditionLabels[condition]} • {selectedPlatforms.map(p => platformLabels[p].split(' ')[0]).join(', ')}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep('details')} className="btn-secondary">
              <ArrowLeft size={18} />
              Back
            </button>
            <button
              onClick={generateListings}
              disabled={generating}
              className="btn-primary disabled:opacity-50"
            >
              {generating ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Generate Listings
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-4 animate-slide-up">
          <div className="card p-6">
            <h2 className="font-display text-xl mb-2">Review & Post</h2>
            <p className="text-muted mb-6">
              Review your listings and post to each platform
            </p>
          </div>

          {generatedListings.map((listing) => (
            <div key={listing.platform} className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <span className={`badge-${listing.platform} text-sm`}>
                  {platformLabels[listing.platform]}
                </span>
                <span className="font-display text-xl text-ink">
                  ${listing.suggestedPrice}
                </span>
              </div>

              <h3 className="font-medium text-ink mb-2">{listing.title}</h3>
              <p className="text-muted text-sm whitespace-pre-wrap mb-4">
                {listing.description}
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => copyToClipboard(listing.platform)}
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
                      Copy
                    </>
                  )}
                </button>
                <button
                  onClick={() => openPlatformPostPage(listing.platform)}
                  className="btn-primary flex-1"
                >
                  Post on {platformLabels[listing.platform].split(' ')[0]}
                  <ExternalLink size={16} />
                </button>
              </div>
            </div>
          ))}

          <div className="flex justify-between pt-4">
            <button onClick={() => setStep('generate')} className="btn-secondary">
              <ArrowLeft size={18} />
              Regenerate
            </button>
            <button
              onClick={saveAndPost}
              disabled={saving}
              className="btn-primary"
            >
              {saving ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check size={18} />
                  Save Item
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
