require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase
      .from('withdrawals')
      .select('id, amount_requested, fee_amount, net_amount, status, pix_key, created_at, user_profiles!inner(mocha_user_id)');
      
  console.log("Result:", JSON.stringify({ data, error }, null, 2));
}

test();
