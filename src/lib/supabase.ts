import { createClient } from '@supabase/supabase-js'

// @ts-ignore - Vite environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
// @ts-ignore - Vite environment variables  
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

console.log('=== SUPABASE CONFIG ===')
console.log('Supabase URL:', supabaseUrl ? '✅ Configurada' : '❌ Não configurada')
console.log('Supabase Key:', supabaseAnonKey ? '✅ Configurada' : '❌ Não configurada')
console.log('URL completa:', supabaseUrl)

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase credentials not found. Please check your environment variables.')
} else {
  console.log('🚀 Supabase client criado com sucesso!')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)