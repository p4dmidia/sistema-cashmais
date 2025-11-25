import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

function genCPF() {
  const r = () => Math.floor(Math.random() * 9)
  let b = Array.from({ length: 9 }, r)
  while (b.every(d => d === b[0])) b = Array.from({ length: 9 }, r)
  const d = (arr, k) => {
    let s = 0
    for (let i = 0; i < arr.length; i++) s += arr[i] * (k - i)
    let rem = (s * 10) % 11
    return rem === 10 || rem === 11 ? 0 : rem
  }
  const d1 = d(b, 10)
  const d2 = d([...b, d1], 11)
  return [...b, d1, d2].join('')
}

async function main() {
  const base = 'https://www.cashmais.net.br'
  const ANON = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  const URL = process.env.SUPABASE_URL
  const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!ANON || !URL || !SRK) {
    console.error('Missing keys: ANON/SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }
  const supabase = createClient(URL, SRK)

  const parentCpf = process.argv[2] || '64185564023'
  const parentPwd = process.argv[3] || '123456'
  const cashierCpf = process.argv[4] || '62480845052'
  const cashierPwd = process.argv[5] || '123456'

  const loginParent = await fetch(`${base}/api/affiliate/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON}` },
    body: JSON.stringify({ cpf: parentCpf, password: parentPwd })
  })
  const parentJson = await loginParent.json().catch(() => ({}))
  if (!loginParent.ok) {
    console.error('Parent login failed:', parentJson)
    process.exit(1)
  }
  const parentCookies = loginParent.headers.get('set-cookie') || ''
  const meRes = await fetch(`${base}/api/affiliate/me`, { headers: { 'Authorization': `Bearer ${ANON}`, 'Cookie': parentCookies } })
  const meJson = await meRes.json().catch(() => ({}))
  const referral = meJson.referral_code
  console.log('Parent referral_code:', referral)

  async function registerChild(name) {
    const cpf = genCPF()
    const email = `${name}.${Date.now()}@example.com`
    const res = await fetch(`${base}/api/affiliate/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON}` },
      body: JSON.stringify({ full_name: name, cpf, email, whatsapp: '11999999999', password: 'Senha123!', referral_code: referral })
    })
    const js = await res.json().catch(() => ({}))
    console.log('Register', name, 'status:', res.status)
    return { cpf, js }
  }

  const c1 = await registerChild('Direto1')
  const c2 = await registerChild('Direto2')
  const c3 = await registerChild('Direto3')

  // Login as c1 to get its referral_code, then register neto under c1
  const loginC1 = await fetch(`${base}/api/affiliate/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON}` },
    body: JSON.stringify({ cpf: c1.cpf, password: 'Senha123!' })
  })
  const c1Cookies = loginC1.headers.get('set-cookie') || ''
  const meC1Res = await fetch(`${base}/api/affiliate/me`, { headers: { 'Authorization': `Bearer ${ANON}`, 'Cookie': c1Cookies } })
  const meC1 = await meC1Res.json().catch(() => ({}))
  const c1Referral = meC1.referral_code
  console.log('c1 referral_code:', c1Referral)

  const netoCpf = genCPF()
  const netoEmail = `neto.${Date.now()}@example.com`
  const netoRes = await fetch(`${base}/api/affiliate/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON}` },
    body: JSON.stringify({ full_name: 'Neto1', cpf: netoCpf, email: netoEmail, whatsapp: '11999999999', password: 'Senha123!', referral_code: c1Referral })
  })
  console.log('Register neto status:', netoRes.status)
  const netoJs = await netoRes.json().catch(() => ({}))

  // Cashier login
  const loginCashier = await fetch(`${base}/api/caixa/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON}` },
    body: JSON.stringify({ cpf: cashierCpf, password: cashierPwd })
  })
  const cashierCookies = loginCashier.headers.get('set-cookie') || ''
  console.log('Cashier login status:', loginCashier.status)

  // Perform purchase for neto
  const purchaseRes = await fetch(`${base}/api/caixa/compra`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON}`, 'Cookie': cashierCookies },
    body: JSON.stringify({ customer_coupon: netoCpf, purchase_value: 100 })
  })
  const purchaseJs = await purchaseRes.json().catch(() => ({}))
  console.log('Purchase status:', purchaseRes.status)
  console.log('Purchase response:', purchaseJs)

  // Find purchase id (latest by customer_coupon and cashier_cpf)
  const { data: purchases } = await supabase
    .from('company_purchases')
    .select('id')
    .eq('customer_coupon', netoCpf)
    .eq('cashier_cpf', cashierCpf)
    .order('id', { ascending: false })
    .limit(1)
  const purchaseId = purchases?.[0]?.id
  console.log('Found purchase id:', purchaseId)

  if (purchaseId) {
    const { data: rows } = await supabase
      .from('commission_distributions')
      .select('affiliate_id, level, commission_amount, is_blocked')
      .eq('purchase_id', purchaseId)
      .order('level')
    console.log('Commissions:', rows)
  } else {
    console.log('Could not query commission_distributions by purchase (no purchase id). Trying by affiliates...')
    // Look up affiliate ids by CPF
    const { data: parentAff } = await supabase
      .from('affiliates')
      .select('id')
      .eq('cpf', parentCpf)
      .maybeSingle()
    const { data: netoAff } = await supabase
      .from('affiliates')
      .select('id')
      .eq('cpf', netoCpf)
      .maybeSingle()
    const parentId = parentAff?.id
    const netoId = netoAff?.id
    console.log('Affiliate IDs:', { parentId, netoId })
    // Query recent commissions for parent and neto
    const sinceIso = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { data: parentComms } = await supabase
      .from('commission_distributions')
      .select('purchase_id, level, commission_amount, is_blocked, created_at')
      .eq('affiliate_id', parentId)
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .limit(10)
    const { data: netoComms } = await supabase
      .from('commission_distributions')
      .select('purchase_id, level, commission_amount, is_blocked, created_at')
      .eq('affiliate_id', netoId)
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .limit(10)
    console.log('Parent recent commissions:', parentComms)
    console.log('Neto recent commissions:', netoComms)
  }

  // Also verify via affiliate APIs (balance and transactions)
  await new Promise(r => setTimeout(r, 1500))
  const balRes = await fetch(`${base}/api/users/balance`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${ANON}`, 'Cookie': parentCookies }
  })
  const balJs = await balRes.json().catch(() => ({}))
  console.log('Parent balance status:', balRes.status)
  console.log('Parent balance:', balJs)

  const txRes = await fetch(`${base}/api/transactions`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${ANON}`, 'Cookie': parentCookies }
  })
  const txJs = await txRes.json().catch(() => ({}))
  console.log('Parent transactions status:', txRes.status)
  console.log('Parent transactions:', txJs)

  // Also check c1 balance and transactions
  const c1BalRes = await fetch(`${base}/api/users/balance`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${ANON}`, 'Cookie': c1Cookies }
  })
  const c1BalJs = await c1BalRes.json().catch(() => ({}))
  console.log('c1 balance status:', c1BalRes.status)
  console.log('c1 balance:', c1BalJs)

  const c1TxRes = await fetch(`${base}/api/transactions`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${ANON}`, 'Cookie': c1Cookies }
  })
  const c1TxJs = await c1TxRes.json().catch(() => ({}))
  console.log('c1 transactions status:', c1TxRes.status)
  console.log('c1 transactions:', c1TxJs)
}

main().catch((e) => { console.error(e); process.exit(1) })
