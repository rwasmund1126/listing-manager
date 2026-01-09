# Listing Manager

A tool to manage your online marketplace listings across eBay, Facebook Marketplace, and Craigslist. Uses AI to generate platform-optimized descriptions and suggests pricing based on item details.

## Features

- **Multi-platform listings**: Create optimized descriptions for eBay, Facebook Marketplace, and Craigslist
- **AI-powered descriptions**: Claude generates tailored descriptions for each platform's style and audience  
- **Smart pricing**: AI suggests fair prices based on item type and condition
- **Image optimization**: Automatically compresses and resizes images
- **Listing tracking**: Monitor how long items have been posted
- **Optimization suggestions**: Get tips to help items sell faster (price drops, relisting)

## Tech Stack

- **Next.js 14** - React framework with App Router
- **Supabase** - Database + file storage
- **Claude API** - AI description generation
- **Tailwind CSS** - Styling
- **Sharp** - Image optimization

## Setup

### 1. Prerequisites

- Node.js 18+
- Supabase account
- Anthropic API key (for Claude)

### 2. Clone and install

```bash
git clone <your-repo>
cd listing-manager
npm install
```

### 3. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the schema from `supabase/schema.sql`
3. Go to Storage and create a bucket called `item-images` with public access:
   - Click "New bucket"
   - Name: `item-images`
   - Public bucket: Yes

### 4. Get your Anthropic API key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an account or sign in
3. Go to API Keys and create a new key

### 5. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
ANTHROPIC_API_KEY=sk-ant-your-key
```

### 6. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Usage

### Adding a new item

1. Click "New Item" from the dashboard
2. Upload up to 3 photos
3. Enter a brief description (include brand, size, color, condition details)
4. Select the item condition
5. Choose which platforms to list on
6. Click "Generate Listings" - AI creates optimized descriptions for each platform
7. Review the generated listings and prices
8. Click "Copy" then "Post" for each platform - opens the platform's posting page
9. Paste your description and upload your images
10. Save the item to track it

### Managing listings

- **Mark as Posted**: After posting to a platform, mark it as posted to start tracking
- **Mark as Sold**: When an item sells, mark the listing as sold
- **Optimization suggestions**: Items posted 7+ days get suggestions for price drops or relisting

### Dashboard

- View all items at a glance
- Filter by status (All, Active, Sold)
- See which items need attention (posted 7+ days)
- Quick stats on total items, active listings, and sold items

## Posting Workflow (TOS-Compliant)

Since Facebook Marketplace and Craigslist don't have public APIs, the app uses a "copy and paste" workflow:

1. **AI generates** the description
2. **You copy** it to clipboard with one click  
3. **App opens** the platform's posting page
4. **You paste** and upload images
5. **You submit** the listing

This keeps you in control and compliant with each platform's terms of service.

## Future Enhancements

When you're ready to go SaaS:

- [ ] Add Supabase Auth for user accounts
- [ ] Enable Row Level Security on tables
- [ ] Move to Supabase Pro for more storage
- [ ] Add eBay API integration for draft listings
- [ ] Add pricing data from eBay completed listings
- [ ] Add email notifications for stale listings
- [ ] Add bulk import from spreadsheet

## License

MIT
