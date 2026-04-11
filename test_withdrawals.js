require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data, error } = await supabase
      .from('withdrawals')
      .select('id, amount_requested, fee_amount, net_amount, status, pix_key, created_at, affiliate_id, affiliates!inner(full_name,cpf,email)', { count: 'exact' })
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
      
  console.log("With inner:", { data, error });

  const { data: data2, error: error2 } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('status', 'pending');
      
  console.log("Without inner:", { data2, error2 });

  const { data: data3, error: error3 } = await supabase
      .from('withdrawals')
      .select('*, affiliates!withdrawals_affiliate_id_fkey(full_name,cpf,email)')
      .eq('status', 'pending');

  console.log("Explicit fkey:", { data3, error3 });
}

test();
