# Listing Manager

A tool for managing online marketplace listings across eBay, Facebook Marketplace, and Craigslist with AI-generated descriptions.

## Tech Stack

- **Next.js 15** with App Router
- **Supabase** for database (Postgres) and file storage
- **OpenAI API** (GPT-4o) for description generation
- **Tailwind CSS** for styling
- **TypeScript** throughout

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Dashboard - main listing view
│   ├── layout.tsx                  # Root layout
│   ├── globals.css                 # Tailwind + custom styles
│   ├── items/
│   │   ├── new/page.tsx            # New item wizard (4 steps)
│   │   └── [id]/page.tsx           # Item detail + listing management
│   └── api/
│       ├── generate-listings/route.ts  # OpenAI API integration
│       └── optimize-image/route.ts     # Sharp image processing
├── lib/
│   ├── supabase.ts                 # Supabase client
│   └── database.types.ts           # TypeScript types + enums
supabase/
└── schema.sql                      # Database schema (run in Supabase SQL editor)
```

## Key Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server at localhost:3000
npm run build        # Production build
npm run lint         # Run ESLint
```

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
OPENAI_API_KEY=sk-...
```

## Database Schema

Two main tables:
- **items**: id, brief_description, condition, images[], created_at
- **listings**: id, item_id (FK), platform, generated_description, suggested_price, status, posted_at, sold_at

Enums:
- `item_condition`: new_with_tags, like_new, good, fair
- `platform`: ebay, facebook, craigslist  
- `listing_status`: draft, ready, posted, sold

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
1. Update `supabase/schema.sql`
2. Update types in `src/lib/database.types.ts`
3. Run new SQL in Supabase dashboard

## Setup Checklist

- [ ] Run `npm install`
- [ ] Create Supabase project
- [ ] Run `supabase/schema.sql` in Supabase SQL Editor
- [ ] Add RLS policies (see below)
- [ ] Create `item-images` storage bucket (public)
- [ ] Get OpenAI API key from platform.openai.com/api-keys
- [ ] Create `.env.local` with all three env vars
- [ ] Run `npm run dev`

## Supabase RLS Policies

Run these in SQL Editor to allow inserts without auth:

```sql
-- Allow all operations on items
CREATE POLICY "Allow all on items" ON items FOR ALL USING (true) WITH CHECK (true);

-- Allow all operations on listings
CREATE POLICY "Allow all on listings" ON listings FOR ALL USING (true) WITH CHECK (true);

-- Storage policies for item-images bucket
CREATE POLICY "Allow public uploads" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'item-images');

CREATE POLICY "Allow public reads" ON storage.objects
FOR SELECT USING (bucket_id = 'item-images');
```

## Design Decisions

- **No auto-posting**: FB Marketplace and Craigslist have no APIs; eBay API adds complexity. Using copy/paste workflow to stay TOS-compliant.
- **GPT-4o for pricing**: Instead of scraping, OpenAI estimates based on item type/condition. Can add eBay API later for real sold data.
- **Supabase storage**: Images stored in Supabase bucket, paths saved in items.images array.
- **Local-first**: No auth yet. Add Supabase Auth + RLS when going SaaS.

## Image Upload

**Supported formats**: JPEG, PNG, WebP, GIF

**HEIC not supported**: Sharp's prebuilt binaries don't include HEIC decoding. Users see a message explaining how to convert via Mac Preview (File → Export → JPEG).

## Listing Workflow

1. **Ready** - Listing generated, ready to copy/post
2. **Posted** - User marked as posted (via ⋮ menu on item detail page)
3. **Sold** - User marked as sold

The ⋮ menu next to each listing's price shows status actions.

## Notes for Claude Code

- This is a Next.js 15 App Router project (not Pages Router)
- All pages with interactivity need 'use client' directive
- Supabase client is initialized in `src/lib/supabase.ts`
- Use existing component classes from globals.css before adding new styles
- The generate-listings API expects FormData, not JSON
- Image uploads go through client-side validation, not server optimization
