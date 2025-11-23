import 'dotenv/config'
import fetch from 'node-fetch'

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
  const cpf = process.argv[2]
  const password = process.argv[3]
  const pref = process.argv[4] || 'right' // left|center|right|auto
  if (!cpf || !password) {
    console.error('Usage: node scripts/test-placement-preference.js <cpf> <password> [preference]')
    process.exit(1)
  }
  const anon = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  const base = 'https://www.cashmais.net.br'

  const loginRes = await fetch(`${base}/api/affiliate/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${anon}` },
    body: JSON.stringify({ cpf, password })
  })
  const loginJson = await loginRes.json().catch(() => ({}))
  if (!loginRes.ok) {
    console.error('Login failed:', loginJson)
    process.exit(1)
  }
  const setCookies = loginRes.headers.raw()['set-cookie'] || []
  const cookieHeader = setCookies.map((c) => c.split(';')[0]).join('; ')

  const meRes = await fetch(`${base}/api/affiliate/me`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${anon}`, 'Cookie': cookieHeader },
  })
  const meJson = await meRes.json().catch(() => ({}))
  const referral = meJson.referral_code
  console.log('Current referral_code:', referral)

  const setPrefRes = await fetch(`${base}/api/affiliate/network/preference`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${anon}`, 'Cookie': cookieHeader },
    body: JSON.stringify({ preference: pref })
  })
  console.log('Set preference status:', setPrefRes.status)

  const newEmail = `auto.place.${Date.now()}@example.com`
  const newCpf = generateValidCPF()
  const regRes = await fetch(`${base}/api/affiliate/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${anon}` },
    body: JSON.stringify({ full_name: 'Teste Preferencia', cpf: newCpf, email: newEmail, whatsapp: '11999999999', password: 'Senha123!', referral_code: referral })
  })
  console.log('Register status:', regRes.status)
  const regJson = await regRes.json().catch(() => ({}))
  console.log('Register response:', regJson)

  const treeRes = await fetch(`${base}/api/affiliate/network/tree?max_depth=2`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${anon}`, 'Cookie': cookieHeader },
  })
  const treeJson = await treeRes.json().catch(() => ({}))
  console.log('Children of root after placement:', Array.isArray(treeJson.children) ? treeJson.children.map(c => c.id) : [])
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})