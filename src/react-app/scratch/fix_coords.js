
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixCoordinates() {
  console.log('Checking for companies in category "marceneiro"...');
  
  // Get category ID for marceneiro
  const { data: catData } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', 'marceneiro')
    .single();

  if (!catData) {
    console.log('Category marceneiro not found');
    return;
  }

  // Get companies in this category
  const { data: companies } = await supabase
    .from('company_categories')
    .select('company_id')
    .eq('category_id', catData.id);

  if (!companies || companies.length === 0) {
    console.log('No companies found in category marceneiro');
    return;
  }

  const ids = companies.map(c => c.company_id);
  console.log(`Found ${ids.length} companies. Updating coordinates...`);

  // Sete Lagoas coords
  const coords = [
    { lat: -19.4660, lng: -44.2460 },
    { lat: -19.4700, lng: -44.2500 },
    { lat: -19.4600, lng: -44.2400 }
  ];

  for (let i = 0; i < ids.length; i++) {
    const coord = coords[i % coords.length];
    const { error } = await supabase
      .from('companies')
      .update({ 
        latitude: coord.lat, 
        longitude: coord.lng,
        address_city: 'Sete Lagoas',
        is_verified: true
      })
      .eq('id', ids[i]);
    
    if (error) console.error(`Error updating company ${ids[i]}:`, error);
    else console.log(`Updated company ${ids[i]} with coords ${coord.lat}, ${coord.lng}`);
  }
}

fixCoordinates();
