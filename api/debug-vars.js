export default function handler(req, res) {
  const state = (name) => (process.env[name] ? 'defined' : 'undefined')
  res.setHeader('Content-Type', 'application/json')
  res.status(200).json({
    SUPABASE_URL: state('SUPABASE_URL'),
    VITE_SUPABASE_URL: state('VITE_SUPABASE_URL'),
    DATABASE_URL: state('DATABASE_URL'),
    NEXT_PUBLIC_SUPABASE_URL: state('NEXT_PUBLIC_SUPABASE_URL'),
    time: new Date().toISOString(),
  })
}

