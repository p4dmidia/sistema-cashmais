import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixSeteLagoas() {
  const { data: companies } = await supabase
    .from('companies')
    .select('*')
    .eq('address_city', 'Sete Lagoas');

  for (const co of companies) {
    const q = `${co.address_street}, ${co.address_number}, ${co.address_city}, MG, Brazil`;
    console.log(`Fixing ${co.nome_fantasia}...`);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`, {
        headers: { 'User-Agent': 'CashMais-Fixer/1.0' }
      });
      const data = await res.json();
      if (data && data[0]) {
        await supabase.from('companies').update({ 
          latitude: parseFloat(data[0].lat), 
          longitude: parseFloat(data[0].lon) 
        }).eq('id', co.id);
        console.log(`  -> SUCCESS: ${data[0].lat}, ${data[0].lon}`);
      } else {
        console.log(`  -> FAILED: No results for ${q}`);
      }
    } catch (e) {
      console.error(`  -> ERROR: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 1000));
  }
}

fixSeteLagoas();
