import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// === INTERFACES ===
export interface DBEvent {
  id: string
  title: string
  date: string
  time: string
  venue: string
  city: 'Brazzaville' | 'Pointe-Noire'
  category: string
  price: number
  capacity: number
  sold: number
  description: string
  gradient: string
  icon: string
  image_url?: string
  organizer_id?: string
  created_at: string
}

export interface DBOrder {
  id: string
  event_id: string
  category_id?: string
  first_name: string
  last_name: string
  whatsapp: string
  email: string
  quantity: number
  total_price: number
  status: 'pending' | 'paid' | 'cancelled'
  qr_code: string
  qr_code_url?: string
  used: boolean
  used_at?: string
  created_at: string
}

export interface DBOrganizer {
  id: string
  email: string
  org_name: string
  whatsapp?: string
  created_at: string
}

export interface DBTicketCategory {
  id: string
  event_id: string
  name: string
  price: number
  capacity: number
  sold: number
  color: string
  created_at: string
}