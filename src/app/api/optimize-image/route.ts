import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('image') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      )
    }

    // Check file type - allow HEIC and empty type (some browsers don't detect HEIC)
    const isHeic = file.type === 'image/heic' || file.type === 'image/heif' ||
                   file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')
    const isAllowed = ALLOWED_MIME_TYPES.includes(file.type) || file.type === '' || isHeic

    if (!isAllowed) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF, HEIC' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // Optimize the image (Sharp handles HEIC conversion automatically)
    const optimized = await sharp(buffer)
      .resize(1200, 1200, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({
        quality: 85,
        progressive: true,
      })
      .toBuffer()

    // Return the optimized image as base64
    const base64 = optimized.toString('base64')
    const mimeType = 'image/jpeg'

    return NextResponse.json({
      optimizedImage: `data:${mimeType};base64,${base64}`,
      originalSize: buffer.length,
      optimizedSize: optimized.length,
      savings: Math.round((1 - optimized.length / buffer.length) * 100),
    })
  } catch (error) {
    console.error('Error optimizing image:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to optimize image: ${message}` },
      { status: 500 }
    )
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
}
