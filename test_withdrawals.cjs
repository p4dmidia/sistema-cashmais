require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase
      .from('withdrawals')
      .select('*');
      
  console.log("Result:", JSON.stringify({ data, error }, null, 2));
}

test();
