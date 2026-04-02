const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'supabase', 'functions', 'api', 'index.ts');
let content = fs.readFileSync(filePath, 'utf8');

// The line we want to target:
// .select('id, amount_requested, fee_amount, net_amount, status, pix_key, created_at, affiliate_id, affiliates(full_name,cpf,email)', { count: 'exact' })

content = content.replace(
  /\.select\('id, amount_requested, fee_amount, net_amount, status, pix_key, created_at, affiliate_id, affiliates\(full_name,cpf,email\)', \{ count: 'exact' \}\)/g,
  ".select('id, amount_requested, fee_amount, net_amount, status, pix_key, created_at, user_profiles!inner(mocha_user_id)', { count: 'exact' })"
);

// Second we replace the `const items = (rows || []).map(...)`
const itemsMapRegex = /const items = \(rows \|\| \[\]\)\.map\(\(w: any\) => \(\{ id: w\.id, amount_requested: Number\(w\.amount_requested \|\| 0\), fee_amount: Number\(w\.fee_amount \|\| 0\), net_amount: Number\(w\.net_amount \|\| 0\), status: w\.status, pix_key: w\.pix_key \|\| '', created_at: w\.created_at, full_name: w\.affiliates\?\.full_name \|\| 'N\/A', cpf: w\.affiliates\?\.cpf \|\| 'N\/A', email: w\.affiliates\?\.email \|\| 'N\/A' \}\)\)/g;

const newMapCode = `const items = [] as any[];
    for (const w of rows || []) {
      let affiliateInfo = { full_name: 'N/A', cpf: 'N/A', email: 'N/A' };
      const mochaUserId = (w as any).user_profiles?.mocha_user_id;
      if (mochaUserId && mochaUserId.startsWith('affiliate_')) {
        const affId = mochaUserId.split('_')[1];
        const { data: aff } = await supabase.from('affiliates').select('full_name, cpf, email').eq('id', Number(affId)).single();
        if (aff) affiliateInfo = aff;
      }
      items.push({ id: w.id, amount_requested: Number(w.amount_requested || 0), fee_amount: Number(w.fee_amount || 0), net_amount: Number(w.net_amount || 0), status: w.status, pix_key: w.pix_key || '', created_at: w.created_at, full_name: affiliateInfo.full_name, cpf: affiliateInfo.cpf, email: affiliateInfo.email });
    }`;

content = content.replace(itemsMapRegex, newMapCode);

fs.writeFileSync(filePath, content);
console.log('Patch complete!');
