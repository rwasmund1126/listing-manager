import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

// Create a placeholder client if env vars are missing (for build time)
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
)

// Helper function to get public URL for images
export function getImageUrl(path: string): string {
  const { data } = supabase.storage.from('item-images').getPublicUrl(path)
  return data.publicUrl
}
