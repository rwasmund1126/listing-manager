import { NextRequest, NextResponse } from 'next/server'
import { getApplicationToken } from '@/lib/ebay/auth'
import { getEbayConfig, EBAY_CATEGORY_TREE_ID } from '@/lib/ebay/config'

interface EbayCategorySuggestion {
  category: {
    categoryId: string
    categoryName: string
  }
  categoryTreeNodeAncestors?: Array<{
    categoryName: string
    categoryId: string
  }>
  categoryTreeNodeLevel: number
}

interface TaxonomyResponse {
  categorySuggestions?: EbayCategorySuggestion[]
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')

  if (!query || query.trim().length < 2) {
    return NextResponse.json(
      { error: 'Search query must be at least 2 characters' },
      { status: 400 }
    )
  }

  try {
    const token = await getApplicationToken()
    const config = getEbayConfig()

    const url = `${config.apiBaseUrl}/commerce/taxonomy/v1/category_tree/${EBAY_CATEGORY_TREE_ID}/get_category_suggestions?q=${encodeURIComponent(query.trim())}`

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('eBay Taxonomy API error:', errorData)
      return NextResponse.json(
        { error: 'Failed to fetch category suggestions' },
        { status: response.status }
      )
    }

    const data: TaxonomyResponse = await response.json()

    const suggestions = (data.categorySuggestions || []).map((s) => {
      const breadcrumb = s.categoryTreeNodeAncestors
        ? [...s.categoryTreeNodeAncestors].reverse().map((a) => a.categoryName).join(' > ')
        : ''

      return {
        categoryId: s.category.categoryId,
        categoryName: s.category.categoryName,
        breadcrumb,
      }
    })

    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error('Category suggestions error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch suggestions' },
      { status: 500 }
    )
  }
}
