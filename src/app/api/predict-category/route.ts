import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { description, condition } = await request.json()

    if (!description) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 })
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 512,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are an eBay category expert. Given an item description, predict the most likely eBay category IDs and names. Return a JSON object with a "predictions" array containing exactly 3 objects, each with "categoryId" (string), "categoryName" (string), and "confidence" (number 0-1).

Common eBay categories for reference:
- Women's Clothing, Shoes & Accessories: Dresses (63861), Tops (53159), Jeans (11554), Coats & Jackets (63862), Athletic Shoes (95672), Heels (55793), Boots (53557)
- Men's Clothing, Shoes & Accessories: Shirts (57990), Pants (57989), Coats & Jackets (57988), Athletic Shoes (15709), Dress Shoes (53120)
- Electronics: Cell Phones (9355), Laptops (175672), Tablets (171485), Cameras (31388), Headphones (112529), Video Games (139973), Smart Watches (178893)
- Home & Garden: Kitchen (20625), Bedding (20444), Furniture (3197), Tools (631), Small Appliances (20672), Lamps (20697)
- Sporting Goods: Exercise Equipment (28063), Golf (1513), Cycling (7294), Fishing (1492), Camping (16034)
- Toys & Hobbies: Action Figures (246), Building Toys (183446), Dolls (238), Games (233), Model Trains (479)
- Baby: Clothing (3082), Strollers (66698), Car Seats (66692), Feeding (66717), Toys (19068)
- Health & Beauty: Skin Care (11863), Hair Care (11854), Makeup (31786), Fragrances (11848)
- Books: Fiction (279), Nonfiction (280), Textbooks (2228), Children's (1127)
- Collectibles: Trading Cards (868), Coins (253), Stamps (260), Art (550)
- Jewelry & Watches: Necklaces (67658), Rings (67681), Earrings (67660), Watches (31387)
- Pet Supplies: Dog (20742), Cat (20741), Fish (20754), Bird (20735)

Use the most specific subcategory that fits. If the item doesn't clearly match these, use your knowledge of eBay's full category tree.`,
        },
        {
          role: 'user',
          content: `Item: ${description}\nCondition: ${condition || 'Not specified'}`,
        },
      ],
    })

    const responseText = completion.choices[0]?.message?.content || '{}'
    const parsed = JSON.parse(responseText)

    return NextResponse.json({
      predictions: parsed.predictions || [],
    })
  } catch (error) {
    console.error('Category prediction error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to predict category' },
      { status: 500 }
    )
  }
}
