import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

function generateValidCPF() {
  const rand = () => Math.floor(Math.random() * 9)
  let base = Array.from({ length: 9 }, rand)
  while (base.every((d) => d === base[0])) base = Array.from({ length: 9 }, rand)
  const calcDigit = (arr, factorStart) => {
    let sum = 0
    for (let i = 0; i < arr.length; i++) sum += arr[i] * (factorStart - i)
    let rem = (sum * 10) % 11
    return rem === 10 || rem === 11 ? 0 : rem
  }
  const d1 = calcDigit(base, 10)
  const d2 = calcDigit([...base, d1], 11)
  const digits = [...base, d1, d2].join('')
  return digits
}

async function main() {
  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env')
    process.exit(1)
  }

  const cpf = generateValidCPF()
  const email = `web.teste.${Date.now()}@example.com`
  const full_name = 'Teste Web Afiliado'
  const whatsapp = '11999999999'
  const password = 'Senha123!'

  const registerUrl = 'https://www.cashmais.net.br/api/affiliate/register'
  console.log('Calling web endpoint:', registerUrl)
  const res = await fetch(registerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
    body: JSON.stringify({ full_name, cpf, email, whatsapp, password, referral_code: null })
  })
  const json = await res.json().catch(() => ({}))
  console.log('Register status:', res.status)
  console.log('Register response:', json)

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const { data: coupon, error } = await supabase
    .from('customer_coupons')
    .select('id, coupon_code, user_id, cpf, is_active')
    .eq('coupon_code', cpf)
    .maybeSingle()

  if (error) {
    console.error('Query error:', error.message)
  } else if (!coupon) {
    console.log('No customer_coupons row found for CPF:', cpf)
  } else {
    console.log('Found customer_coupons row:', coupon)
  }
}

main().catch((e) => {
  console.error('Unexpected error:', e)
  process.exit(1)
})