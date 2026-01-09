import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import type { Platform, ItemCondition } from '@/lib/database.types'
import { conditionLabels, platformLabels } from '@/lib/database.types'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface GeneratedListing {
  platform: Platform
  title: string
  description: string
  suggestedPrice: number
}

const VALID_CONDITIONS: ItemCondition[] = ['new_with_tags', 'like_new', 'good', 'fair']
const VALID_PLATFORMS: Platform[] = ['ebay', 'facebook', 'craigslist']
const MAX_DESCRIPTION_LENGTH = 2000

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const briefDescription = formData.get('briefDescription') as string
    const condition = formData.get('condition') as ItemCondition
    const platformsRaw = formData.get('platforms') as string

    // Validate required fields
    if (!briefDescription || typeof briefDescription !== 'string') {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 })
    }

    // Validate description length
    if (briefDescription.length > MAX_DESCRIPTION_LENGTH) {
      return NextResponse.json(
        { error: `Description must be under ${MAX_DESCRIPTION_LENGTH} characters` },
        { status: 400 }
      )
    }

    // Validate condition
    if (!condition || !VALID_CONDITIONS.includes(condition)) {
      return NextResponse.json({ error: 'Invalid condition' }, { status: 400 })
    }

    // Parse and validate platforms
    let platforms: Platform[]
    try {
      platforms = JSON.parse(platformsRaw)
      if (!Array.isArray(platforms) || platforms.length === 0) {
        throw new Error('Invalid platforms')
      }
      // Filter to only valid platforms
      platforms = platforms.filter(p => VALID_PLATFORMS.includes(p))
      if (platforms.length === 0) {
        throw new Error('No valid platforms')
      }
    } catch {
      return NextResponse.json({ error: 'Invalid platforms' }, { status: 400 })
    }

    // Collect image data for analysis (optional enhancement)
    const imageFiles: File[] = []
    for (let i = 0; i < 3; i++) {
      const file = formData.get(`image${i}`) as File | null
      if (file) imageFiles.push(file)
    }

    // Build the prompt
    const prompt = buildPrompt(briefDescription, condition, platforms)

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    // Parse the response
    const responseText = completion.choices[0]?.message?.content || ''
    
    const listings = parseListings(responseText, platforms)

    return NextResponse.json({ listings })
  } catch (error) {
    console.error('Error generating listings:', error)
    return NextResponse.json(
      { error: 'Failed to generate listings' },
      { status: 500 }
    )
  }
}

function buildPrompt(
  briefDescription: string, 
  condition: ItemCondition, 
  platforms: Platform[]
): string {
  const platformInstructions = platforms.map(p => {
    switch (p) {
      case 'ebay':
        return `**eBay**: Professional, detailed listing. Include specific measurements, brand details, and condition notes. Use keywords for search visibility. Title should be under 80 characters and keyword-rich.`
      case 'facebook':
        return `**Facebook Marketplace**: Casual, friendly tone. Local buyers appreciate brevity and personality. Mention if pickup is available. Title should be short and catchy.`
      case 'craigslist':
        return `**Craigslist**: Brief and to the point. Include key details only. Local focus. Mention cash/local pickup. Title should be simple and descriptive.`
    }
  }).join('\n')

  return `You are an expert at creating marketplace listings that sell. Generate optimized listings for the following item.

**Item Details:**
- Description: ${briefDescription}
- Condition: ${conditionLabels[condition]}

**Generate listings for these platforms:**
${platformInstructions}

**Important Guidelines:**
1. Each listing should be optimized for its platform's style and audience
2. Suggest a realistic price in USD based on the item type, condition, and typical resale values
3. Be honest about condition - don't oversell
4. Include relevant keywords naturally
5. For kids' items, mention size clearly
6. For clothing/shoes, mention brand if recognizable

**Response Format:**
For each platform, provide the response in this exact format:

---PLATFORM: [platform_name]---
TITLE: [title]
PRICE: [price as number only, no $ sign]
DESCRIPTION:
[full description]
---END---

Generate listings for: ${platforms.map(p => platformLabels[p]).join(', ')}`
}

function parseListings(response: string, platforms: Platform[]): GeneratedListing[] {
  const listings: GeneratedListing[] = []

  for (const platform of platforms) {
    const platformRegex = new RegExp(
      `---PLATFORM:\\s*${platform}---[\\s\\S]*?TITLE:\\s*(.+?)\\s*PRICE:\\s*(\\d+(?:\\.\\d{2})?)\\s*DESCRIPTION:\\s*([\\s\\S]*?)---END---`,
      'i'
    )

    const match = response.match(platformRegex)
    if (match) {
      listings.push({
        platform,
        title: match[1].trim(),
        suggestedPrice: parseFloat(match[2]),
        description: match[3].trim(),
      })
    } else {
      // Fallback if parsing fails - create a basic listing
      listings.push({
        platform,
        title: `Item for Sale`,
        suggestedPrice: 25, // Default price
        description: `${response.substring(0, 200)}...`,
      })
    }
  }

  return listings
}
