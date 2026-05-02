import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function geocodeAll() {
  console.log('--- Starting Global Geocoding ---');
  
  // 1. Fetch all companies
  const { data: companies, error } = await supabase
    .from('companies')
    .select('id, nome_fantasia, address_street, address_number, address_city, address_state, address_zip');

  if (error) {
    console.error('Error fetching companies:', error);
    return;
  }

  console.log(`Found ${companies.length} companies to process.`);

  for (const co of companies) {
    // Construct address query
    const query = co.address_street && co.address_city
      ? `${co.address_street}, ${co.address_number || ''}, ${co.address_city}, ${co.address_state || ''}, Brazil`
      : `${co.address_zip}, Brazil`;

    console.log(`Geocoding [${co.id}] ${co.nome_fantasia}: ${query}`);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
        {
          headers: {
            'User-Agent': 'CashMais-Geocoder/1.0'
          }
        }
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);

        const { error: updateError } = await supabase
          .from('companies')
          .update({ latitude: lat, longitude: lon })
          .eq('id', co.id);

        if (updateError) {
          console.error(`  [ERROR] Failed to update ${co.nome_fantasia}:`, updateError.message);
        } else {
          console.log(`  [SUCCESS] Updated to ${lat}, ${lon}`);
        }
      } else {
        console.warn(`  [WARN] No results found for ${co.nome_fantasia}`);
      }
    } catch (err) {
      console.error(`  [ERROR] Request failed for ${co.nome_fantasia}:`, err.message);
    }

    // Rate limit for Nominatim (1 request per second)
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('--- Geocoding Complete ---');
}

geocodeAll();
