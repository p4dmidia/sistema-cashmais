import 'dotenv/config'
import fetch from 'node-fetch'

async function main() {
  const cpf = process.argv[2] || '64185564023'
  const password = process.argv[3] || '123456'
  const anon = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  const base = 'https://www.cashmais.net.br'

  if (!anon) {
    console.error('Missing anon key (VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY)')
    process.exit(1)
  }

  const loginRes = await fetch(`${base}/api/affiliate/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${anon}` },
    body: JSON.stringify({ cpf, password })
  })
  const loginJson = await loginRes.json().catch(() => ({}))
  console.log('Login status:', loginRes.status)
  console.log('Login response:', loginJson)

  const setCookies = loginRes.headers.raw()['set-cookie'] || []
  const cookieHeader = setCookies.map((c) => c.split(';')[0]).join('; ')
  console.log('Cookie header:', cookieHeader)

  const meRes = await fetch(`${base}/api/affiliate/me`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${anon}`, 'Cookie': cookieHeader },
  })
  console.log('Me status:', meRes.status)
  const meJson = await meRes.json().catch(() => ({}))
  console.log('Me response:', meJson)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})