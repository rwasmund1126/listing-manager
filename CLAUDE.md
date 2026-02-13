# Listing Manager

A tool for managing online marketplace listings across eBay, Facebook Marketplace, and Craigslist with AI-generated descriptions, **direct eBay posting via API**, AI-powered category prediction, category search/autocomplete, live listing editing, client-side image background removal, **in-app camera capture**, and **guided AI regeneration**.

## Tech Stack

- **Next.js 15** with App Router
- **Supabase** for database (Postgres) and file storage
- **OpenAI API** (GPT-4o) for description generation
- **eBay Inventory API** for direct listing creation, editing, and management
- **eBay Commerce Taxonomy API** for category search/autocomplete
- **@imgly/background-removal** for client-side image background removal (ONNX)
- **Tailwind CSS** for styling
- **TypeScript** throughout
- **Vercel** for deployment

## Deployment

- **GitHub**: https://github.com/rwasmund1126/listing-manager
- **Production**: https://listing-manager-zeta.vercel.app
- **Vercel Project ID**: `prj_WdEZeDGx34kXjiwYwqiLyBuwSxa4`

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Dashboard - main listing view
│   ├── layout.tsx                  # Root layout
│   ├── globals.css                 # Tailwind + custom styles
│   ├── items/
│   │   ├── new/page.tsx            # New item wizard (3 steps) + background removal + guided regeneration
│   │   └── [id]/page.tsx           # Item detail + eBay posting/editing modals
│   ├── settings/page.tsx           # eBay OAuth connection management
│   ├── privacy/page.tsx            # Privacy policy (required for eBay OAuth)
│   └── api/
│       ├── generate-listings/route.ts  # OpenAI API integration (supports optional guidance)
│       ├── optimize-image/route.ts     # Sharp image processing
│       ├── predict-category/route.ts    # AI category prediction (GPT-4o)
│       └── ebay/
│           ├── auth/route.ts               # Initiate eBay OAuth flow
│           ├── callback/route.ts           # Handle eBay OAuth callback
│           ├── status/route.ts             # Check eBay connection status
│           ├── disconnect/route.ts         # Disconnect eBay account
│           ├── post-listing/route.ts       # Create and publish eBay listing
│           ├── update-listing/route.ts     # Edit live eBay listings
│           └── category-suggestions/route.ts # eBay category search
├── components/
│   └── CameraModal.tsx             # In-app camera with multi-shot capture
├── lib/
│   ├── supabase.ts                 # Supabase client
│   ├── database.types.ts           # TypeScript types + enums
│   └── ebay/
│       ├── index.ts                # eBay library exports
│       ├── config.ts               # eBay API configuration
│       ├── auth.ts                 # OAuth token management + application token
│       ├── client.ts               # eBay API client with retry logic
│       ├── errors.ts               # eBay-specific error types
│       └── listing.ts              # Inventory API helpers (create, update, publish)
supabase/
├── schema.sql                      # Initial database schema
└── migrations/
    ├── 002_ebay_integration.sql    # eBay integration tables/columns
    └── 003_listing_updates.sql     # Add ebay_offer_id and ebay_sku columns
```

## Key Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server at localhost:3000
npm run build        # Production build
npm run lint         # Run ESLint
npm run typecheck    # TypeScript type checking
```

## Environment Variables

### Required in `.env.local`:

```bash
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...

# OpenAI API (Required)
OPENAI_API_KEY=sk-proj-...

# eBay API (Required for direct posting)
EBAY_CLIENT_ID=YourAppName-PRD-...           # Production App ID
EBAY_CLIENT_SECRET=PRD-...                   # Production Cert ID
EBAY_DEV_ID=your-dev-id                      # Developer ID
EBAY_RU_NAME=YourName-YourApp-Prod-xxxxx     # OAuth Redirect URI Name
EBAY_ENVIRONMENT=production                   # or 'sandbox' for testing
```

### Getting eBay Credentials:

1. **Create eBay Developer Account**: https://developer.ebay.com
2. **Create Production Keyset**: https://developer.ebay.com/my/keys
3. **Configure OAuth Redirect URIs**:
   - Auth Accepted URL: `https://your-domain.vercel.app/api/ebay/callback`
   - Auth Declined URL: `https://your-domain.vercel.app/settings?ebay=error&message=Authorization%20declined`
   - Privacy Policy URL: `https://your-domain.vercel.app/privacy`
4. **Copy credentials** to `.env.local` and Vercel environment variables

## Database Schema

### Main Tables:

**items**
- `id` (uuid, PK)
- `brief_description` (text)
- `condition` (item_condition enum)
- `images` (text[])
- `weight_oz` (decimal) - for calculated shipping
- `length_in`, `width_in`, `height_in` (decimal) - package dimensions
- `created_at` (timestamptz)

**listings**
- `id` (uuid, PK)
- `item_id` (uuid, FK → items)
- `platform` (platform enum)
- `generated_description` (text)
- `suggested_price` (decimal)
- `status` (listing_status enum)
- `posted_at` (timestamptz)
- `sold_at` (timestamptz)
- **eBay-specific columns:**
  - `ebay_listing_id` (text) - eBay's listing ID
  - `ebay_offer_id` (text) - eBay offer ID (for updates)
  - `ebay_sku` (text) - eBay inventory item SKU (for updates)
  - `listing_format` (text) - 'fixed_price' or 'auction'
  - `auction_duration` (int) - auction days (3, 5, 7, 10)
  - `starting_bid` (decimal) - auction starting price
  - `ebay_category_id` (text) - eBay category ID
  - `ebay_category_name` (text) - Category display name

**ebay_tokens** (for OAuth)
- `id` (uuid, PK)
- `access_token` (text) - Encrypted OAuth token
- `refresh_token` (text) - For token refresh
- `expires_at` (timestamptz) - Access token expiry
- `refresh_token_expires_at` (timestamptz) - Refresh token expiry
- `scopes` (text[]) - Granted OAuth scopes
- `created_at`, `updated_at` (timestamptz)

### Enums:

- `item_condition`: new_with_tags, like_new, good, fair
- `platform`: ebay, facebook, craigslist
- `listing_status`: draft, ready, posted, sold

## eBay OAuth Scopes

Currently granted (configured in eBay Developer Portal):
- `https://api.ebay.com/oauth/api_scope/sell.inventory`
- `https://api.ebay.com/oauth/api_scope/sell.inventory.readonly`
- `https://api.ebay.com/oauth/api_scope/sell.account`
- `https://api.ebay.com/oauth/api_scope/sell.account.readonly`
- `https://api.ebay.com/oauth/api_scope/sell.fulfillment`

## Setup Checklist

### Initial Setup:
- [x] Run `npm install`
- [x] Create Supabase project
- [x] Run `supabase/schema.sql` in Supabase SQL Editor
- [x] Run `supabase/migrations/002_ebay_integration.sql`
- [x] Run `supabase/migrations/003_listing_updates.sql`
- [x] Add RLS policies (see below)
- [x] Create `item-images` storage bucket (public)
- [x] Get OpenAI API key from platform.openai.com/api-keys
- [x] Create `.env.local` with required env vars

### eBay Integration Setup:
- [x] Create eBay Developer account
- [x] Create Production keyset
- [x] Configure OAuth redirect URIs
- [x] Add eBay credentials to `.env.local`
- [x] Deploy to Vercel
- [x] Add environment variables to Vercel
- [x] Update eBay OAuth with production URL
- [x] Test OAuth connection in Settings

### Deployment:
- [x] Initialize git repository
- [x] Push to GitHub
- [x] Link Vercel project
- [x] Configure Vercel environment variables
- [x] Deploy to production

## Supabase RLS Policies

Run these in SQL Editor:

```sql
-- Allow all operations on items
CREATE POLICY "Allow all on items" ON items FOR ALL USING (true) WITH CHECK (true);

-- Allow all operations on listings
CREATE POLICY "Allow all on listings" ON listings FOR ALL USING (true) WITH CHECK (true);

-- Allow all operations on ebay_tokens
CREATE POLICY "Allow all on ebay_tokens" ON ebay_tokens FOR ALL USING (true) WITH CHECK (true);

-- Storage policies for item-images bucket
CREATE POLICY "Allow public uploads" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'item-images');

CREATE POLICY "Allow public reads" ON storage.objects
FOR SELECT USING (bucket_id = 'item-images');
```

**Note**: These are permissive policies for single-user/development. When adding authentication, tighten these to use `auth.uid()`.

## Common Tasks

### Adding a new API route
Create file in `src/app/api/[route-name]/route.ts` with exported GET/POST/etc functions.

### Adding a new page
Create file in `src/app/[path]/page.tsx`. Use 'use client' directive for interactive pages.

### Modifying the AI prompt
Edit `buildPrompt()` function in `src/app/api/generate-listings/route.ts`.

### Changing styles
- Global styles: `src/app/globals.css`
- Tailwind config: `tailwind.config.ts`
- Component classes: `btn-primary`, `btn-secondary`, `card`, `input`, `badge-[platform]`

### Database changes
1. Create new migration in `supabase/migrations/`
2. Update types in `src/lib/database.types.ts`
3. Run migration in Supabase dashboard
4. Test locally

### Adding eBay API calls
- Use helpers from `src/lib/ebay/client.ts` (`ebayGet`, `ebayPost`, `ebayPut`, `ebayDelete`)
- These automatically handle authentication, retries, and rate limiting
- See `src/lib/ebay/listing.ts` for examples

## Design Decisions

### eBay Integration
- **Direct API posting**: Using eBay Inventory API to create listings programmatically
- **OAuth 2.0**: Secure token-based authentication with auto-refresh
- **Production environment**: Using production eBay API (not sandbox)
- **Inventory Item + Offer workflow**: eBay's recommended approach for listing creation
- **Fixed Price & Auction support**: Both listing formats supported
- **Auto-token refresh**: Tokens refresh automatically with 5-minute buffer before expiry
- **Application token**: Client credentials grant for public APIs (Taxonomy) — no user consent needed
- **Category search**: eBay Commerce Taxonomy API with debounced autocomplete
- **AI category prediction**: GPT-4o predicts top 3 eBay categories from item description
- **Live listing editing**: Update price/description on posted listings via Inventory API (GET-then-PUT merge)
- **Background removal**: Client-side `@imgly/background-removal` (ONNX, ~30MB first download, cached after)
- **In-app camera**: Native `MediaDevices` API with multi-shot, camera flip, and thumbnail preview
- **Guided regeneration**: Optional seller guidance text injected into GPT-4o prompt when regenerating descriptions

### New Item Wizard (3 Steps)
1. **Item Details** — Photos (upload/camera/background removal), description, condition, platform selection
2. **Generate** — Summary review + generate button
3. **Review** — Review listings, optional guidance textarea for AI, inline regenerate, save

### Other Platforms
- **Facebook/Craigslist**: No APIs available; using copy/paste workflow to stay TOS-compliant
- Manual posting with "Copy Description" button

### General
- **GPT-4o for pricing**: OpenAI estimates based on item type/condition
- **Supabase storage**: Images stored in Supabase bucket, paths saved in items.images array
- **Local-first**: No auth yet; Add Supabase Auth + RLS when going SaaS
- **TypeScript strict mode**: Full type safety throughout

## Image Upload

**Supported formats**: JPEG, PNG, WebP, GIF

**HEIC not supported**: Sharp's prebuilt binaries don't include HEIC decoding. Users see a message explaining how to convert via Mac Preview (File → Export → JPEG).

**eBay requirements**: Max 12 images per listing, automatically handled in posting flow.

**Background removal**: Available on image previews in the item details step. Hover over an image to see "Remove BG" button. Uses `@imgly/background-removal` (client-side ONNX). First use downloads ~30MB model, cached after. Undo available to restore original.

**In-app camera**: "Take Photo" button in the item details step opens a full-screen camera modal (`CameraModal` component). Uses `navigator.mediaDevices.getUserMedia` (native browser API, no dependencies). Features: multi-shot capture (up to 3 photos), camera flip (front/rear), thumbnail strip, front-camera mirror. Defaults to rear camera (`facingMode: 'environment'`). Requires HTTPS (handled by Vercel; localhost exempt). Button hidden on browsers without camera support. Captured photos are standard `File` objects that integrate with existing upload flow, background removal, and AI generation.

## Listing Workflow

### Standard Flow (FB/Craigslist):
1. **Ready** - Listing generated, ready to copy/post
2. **Posted** - User marks as posted via ⋮ menu
3. **Sold** - User marks as sold

### eBay Direct Posting Flow:
1. **Ready** - Listing generated
2. **Click "Post to eBay"** - Opens modal
3. **Select category** - AI suggests top 3 categories, or search/type manually
4. **Choose format** - Fixed Price or Auction
5. **Set pricing** - Price, starting bid (auctions)
6. **Post** - Creates inventory item, offer, and publishes live
7. **Posted** - Status auto-updates, eBay listing/offer/SKU IDs saved
8. **View on eBay** - Direct link to live listing
9. **Edit** - Update price/description on live listing via Edit modal

The ⋮ menu next to each listing's price shows status actions.

## eBay Category Selection

Categories can be selected three ways:
1. **AI Prediction** - GPT-4o suggests top 3 categories when the eBay modal opens (clickable chips)
2. **Search Autocomplete** - Type to search eBay's Taxonomy API with debounced requests (300ms)
3. **Manual Entry** - Fall back to browsing https://www.ebay.com/sellercenter/resources/category-ids

Common categories:
- Women's Clothing: `15724`
- Men's Clothing: `1059`
- Shoes: `3034`
- Electronics: `293`

## Error Handling

### eBay-specific errors:
- **Not connected**: Redirects to settings page
- **Token expired**: Prompts to reconnect
- **Rate limiting**: Auto-retries with exponential backoff
- **Category invalid**: User-friendly message with link to category browser
- **Already listed**: Shows existing eBay listing ID

All eBay errors include detailed messages and recovery instructions.

## API Routes

### eBay Integration:
- `GET /api/ebay/auth` - Initiates OAuth flow
- `GET /api/ebay/callback` - OAuth callback handler
- `GET /api/ebay/status` - Check connection status
- `POST /api/ebay/disconnect` - Remove stored tokens
- `POST /api/ebay/post-listing` - Create and publish listing (stores offer ID + SKU)
- `POST /api/ebay/update-listing` - Edit live listing (price, description)
- `GET /api/ebay/category-suggestions?q=` - Search eBay categories (uses application token)

### AI:
- `POST /api/generate-listings` - Generate AI descriptions for all platforms (accepts optional `guidance` field)
- `POST /api/predict-category` - AI category prediction (GPT-4o, returns top 3)

### Core:
- `POST /api/optimize-image` - Process and optimize uploaded images

## Notes for Claude Code

### Architecture:
- This is a Next.js 15 App Router project (not Pages Router)
- All pages with interactivity need 'use client' directive
- Server actions are API routes, not inline Server Actions
- Supabase client is initialized in `src/lib/supabase.ts`

### eBay Integration:
- OAuth tokens stored in `ebay_tokens` table (one row, single user)
- Tokens auto-refresh via `getValidAccessToken()` in `src/lib/ebay/auth.ts`
- Application token via `getApplicationToken()` for public APIs (Taxonomy) — cached in-memory
- All eBay API calls go through `src/lib/ebay/client.ts` helpers
- Error handling via custom error classes in `src/lib/ebay/errors.ts`
- Inventory API workflow: Create Inventory Item → Create Offer → Publish Offer
- Update workflow: GET current state → merge updates → PUT back (both inventory item and offer)
- Offer ID and SKU stored in DB on post for subsequent edits

### Styling:
- Use existing component classes from `globals.css` before adding new styles
- Badge colors: `badge-ebay`, `badge-facebook`, `badge-craigslist`
- Status badges: `badge-success`, `badge-warning`

### Data Flow:
- `generate-listings` API expects FormData (includes image files + optional `guidance` string)
- eBay posting expects JSON with listingId, categoryId, format, pricing
- eBay updating expects JSON with listingId, price?, description?
- Item images are Supabase Storage URLs (not base64 or blobs)
- Image URLs for eBay are resolved via `getImageUrl()` from `src/lib/supabase.ts`
- `@imgly/background-removal` is dynamically imported to avoid SSR issues
- `CameraModal` is a standalone component in `src/components/` — first extracted component

### Testing:
- Local: `npm run dev` on `localhost:3000`
- Production: https://listing-manager-zeta.vercel.app
- eBay sandbox available but currently using production environment

### Deployment:
- Push to GitHub triggers automatic Vercel deployment
- Environment variables must be set in Vercel dashboard
- eBay RU_NAME must match production URL for OAuth to work

## Future Enhancements

Completed:
- [x] eBay category search/autocomplete (Taxonomy API + application token)
- [x] Category prediction using AI (GPT-4o, top 3 predictions)
- [x] Edit/update eBay listings (price + description via Inventory API)
- [x] Image background removal/enhancement (@imgly/background-removal, client-side)
- [x] In-app camera capture (MediaDevices API, multi-shot, camera flip)
- [x] Guided AI regeneration (optional seller guidance in regeneration prompt)
- [x] Streamlined new item wizard (3 steps, combined photos + details)
- [x] Mobile-responsive item detail layout

Remaining:
- [ ] Bulk posting to eBay
- [ ] eBay listing analytics (views, watchers)
- [ ] Shipping policy configuration
- [ ] Multi-user support with Supabase Auth
- [ ] eBay order management
- [ ] Automated repricing based on eBay sold listings API
