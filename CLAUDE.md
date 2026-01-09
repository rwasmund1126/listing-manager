# Listing Manager

A tool for managing online marketplace listings across eBay, Facebook Marketplace, and Craigslist with AI-generated descriptions and **direct eBay posting via API**.

## Tech Stack

- **Next.js 15** with App Router
- **Supabase** for database (Postgres) and file storage
- **OpenAI API** (GPT-4o) for description generation
- **eBay Inventory API** for direct listing creation and management
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
│   │   ├── new/page.tsx            # New item wizard (4 steps)
│   │   └── [id]/page.tsx           # Item detail + eBay posting modal
│   ├── settings/page.tsx           # eBay OAuth connection management
│   ├── privacy/page.tsx            # Privacy policy (required for eBay OAuth)
│   └── api/
│       ├── generate-listings/route.ts  # OpenAI API integration
│       ├── optimize-image/route.ts     # Sharp image processing
│       └── ebay/
│           ├── auth/route.ts           # Initiate eBay OAuth flow
│           ├── callback/route.ts       # Handle eBay OAuth callback
│           ├── status/route.ts         # Check eBay connection status
│           ├── disconnect/route.ts     # Disconnect eBay account
│           └── post-listing/route.ts   # Create and publish eBay listing
├── lib/
│   ├── supabase.ts                 # Supabase client
│   ├── database.types.ts           # TypeScript types + enums
│   └── ebay/
│       ├── index.ts                # eBay library exports
│       ├── config.ts               # eBay API configuration
│       ├── auth.ts                 # OAuth token management
│       ├── client.ts               # eBay API client with retry logic
│       ├── errors.ts               # eBay-specific error types
│       └── listing.ts              # Inventory API helpers
supabase/
├── schema.sql                      # Initial database schema
└── migrations/
    └── 002_ebay_integration.sql    # eBay integration tables/columns
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

## Listing Workflow

### Standard Flow (FB/Craigslist):
1. **Ready** - Listing generated, ready to copy/post
2. **Posted** - User marks as posted via ⋮ menu
3. **Sold** - User marks as sold

### eBay Direct Posting Flow:
1. **Ready** - Listing generated
2. **Click "Post to eBay"** - Opens modal
3. **Select category** - Enter eBay category ID
4. **Choose format** - Fixed Price or Auction
5. **Set pricing** - Price, starting bid (auctions)
6. **Post** - Creates inventory item, offer, and publishes live
7. **Posted** - Status auto-updates, eBay listing ID saved
8. **View on eBay** - Direct link to live listing

The ⋮ menu next to each listing's price shows status actions.

## eBay Category IDs

Find category IDs at:
- **eBay Category Browser**: https://www.ebay.com/sellercenter/resources/category-ids
- **API**: Use Commerce Taxonomy API (future enhancement)

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
- `POST /api/ebay/post-listing` - Create and publish listing

### Core:
- `POST /api/generate-listings` - Generate AI descriptions for all platforms
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
- All eBay API calls go through `src/lib/ebay/client.ts` helpers
- Error handling via custom error classes in `src/lib/ebay/errors.ts`
- Inventory API workflow: Create Inventory Item → Create Offer → Publish Offer

### Styling:
- Use existing component classes from `globals.css` before adding new styles
- Badge colors: `badge-ebay`, `badge-facebook`, `badge-craigslist`
- Status badges: `badge-success`, `badge-warning`

### Data Flow:
- `generate-listings` API expects FormData (includes image files)
- eBay posting expects JSON with listingId, categoryId, format, pricing
- Item images are Supabase Storage URLs (not base64 or blobs)

### Testing:
- Local: `npm run dev` on `localhost:3000`
- Production: https://listing-manager-zeta.vercel.app
- eBay sandbox available but currently using production environment

### Deployment:
- Push to GitHub triggers automatic Vercel deployment
- Environment variables must be set in Vercel dashboard
- eBay RU_NAME must match production URL for OAuth to work

## Future Enhancements

Potential features to add:
- [ ] eBay category search/autocomplete
- [ ] Bulk posting to eBay
- [ ] Edit/update eBay listings
- [ ] eBay listing analytics (views, watchers)
- [ ] Shipping policy configuration
- [ ] Multi-user support with Supabase Auth
- [ ] eBay order management
- [ ] Automated repricing based on eBay sold listings API
- [ ] Image background removal/enhancement
- [ ] Category prediction using AI
