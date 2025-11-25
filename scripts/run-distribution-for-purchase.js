import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

async function hasMinimumReferrals(sb, affiliateId) {
  const { count } = await sb
    .from('affiliates')
    .select('*', { count: 'exact', head: true })
    .eq('sponsor_id', affiliateId)
    .eq('is_active', true)
  return (count || 0) >= 3
}

async function getCommissionSettings(sb) {
  const { data } = await sb
    .from('system_commission_settings')
    .select('level, percentage')
    .eq('is_active', true)
    .order('level', { ascending: true })
  if (Array.isArray(data) && data.length) return data
  return Array.from({ length: 10 }, (_, i) => ({ level: i + 1, percentage: 10 }))
}

async function getOrCreateProfile(sb, affiliateId) {
  const mochaUserId = `affiliate_${affiliateId}`
  const { data: profile } = await sb
    .from('user_profiles')
    .select('id')
    .eq('mocha_user_id', mochaUserId)
    .maybeSingle()
  if (profile?.id) return profile
  const { data: newProfile } = await sb
    .from('user_profiles')
    .upsert({ mocha_user_id: mochaUserId, role: 'affiliate', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: 'mocha_user_id' })
    .select('id')
    .single()
  return newProfile || null
}

async function recordCommission(sb, purchaseId, affiliateId, level, commissionAmount, commissionPercentage, baseCashback, isBlocked) {
  const payload = { purchase_id: purchaseId, affiliate_id: affiliateId, level, commission_amount: commissionAmount, commission_percentage: commissionPercentage, base_cashback: baseCashback, created_at: new Date().toISOString() }
  if (typeof isBlocked === 'boolean') payload.is_blocked = isBlocked
  const { error } = await sb.from('commission_distributions').insert(payload)
  if (error && String(error.message || '').toLowerCase().includes('is_blocked')) {
    await sb.from('commission_distributions').insert({ purchase_id: purchaseId, affiliate_id: affiliateId, level, commission_amount: commissionAmount, commission_percentage: commissionPercentage, base_cashback: baseCashback, created_at: new Date().toISOString() })
  }
}

async function updateEarnings(sb, userId, commissionAmount, isBlocked) {
  await sb
    .from('user_settings')
    .upsert({ user_id: userId, total_earnings: commissionAmount, available_balance: isBlocked ? 0 : commissionAmount, frozen_balance: isBlocked ? commissionAmount : 0, is_active_this_month: true, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
}

async function distributeForCpf(cpf) {
  const URL = process.env.SUPABASE_URL
  const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!URL || !SRK) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  const sb = createClient(URL, SRK)

  const cleanCpf = String(cpf).replace(/\D/g, '')
  const { data: latest } = await sb
    .from('company_purchases')
    .select('id, purchase_value, cashback_percentage')
    .eq('customer_coupon', cleanCpf)
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!latest?.id) throw new Error('No purchase found for CPF: ' + cleanCpf)
  const purchaseId = latest.id
  const baseCashback = (latest.purchase_value * latest.cashback_percentage) / 100

  const { data: customer } = await sb
    .from('affiliates')
    .select('id, sponsor_id')
    .eq('cpf', cleanCpf)
    .single()
  if (!customer?.id) throw new Error('Affiliate not found for CPF: ' + cleanCpf)

  const settings = await getCommissionSettings(sb)
  const totalDistributable = baseCashback * 0.70
  let totalDistributed = 0
  let currentAffiliateId = customer.id
  let currentLevel = 0
  while (currentAffiliateId && currentLevel < 10) {
    const settingsLevel = currentLevel === 0 ? 1 : currentLevel
    const lvl = settings.find(s => s.level === settingsLevel) || { level: settingsLevel, percentage: 10 }
    const qualifies = currentLevel <= 1 ? true : await hasMinimumReferrals(sb, currentAffiliateId)
    const amount = totalDistributable * ((lvl.percentage) / 100)
    totalDistributed += amount
    await recordCommission(sb, purchaseId, currentAffiliateId, currentLevel, amount, lvl.percentage, baseCashback, !qualifies)
    const profile = await getOrCreateProfile(sb, currentAffiliateId)
    if (profile?.id) await updateEarnings(sb, profile.id, amount, !qualifies)
    if (currentLevel === 0) {
      currentAffiliateId = customer.sponsor_id
    } else {
      const { data: sp } = await sb
        .from('affiliates')
        .select('sponsor_id')
        .eq('id', currentAffiliateId)
        .single()
      currentAffiliateId = sp?.sponsor_id || null
    }
    currentLevel++
  }
  const undistributed = totalDistributable - totalDistributed
  const finalCashmaisShare = baseCashback * 0.30 + undistributed
  await sb.from('commission_distributions').insert({ purchase_id: purchaseId, affiliate_id: 0, level: 999, commission_amount: finalCashmaisShare, commission_percentage: 0, base_cashback: baseCashback, created_at: new Date().toISOString() })

  const { data: rows } = await sb
    .from('commission_distributions')
    .select('affiliate_id, level, commission_amount, is_blocked')
    .eq('purchase_id', purchaseId)
    .order('level')
  console.log('Distributed for CPF', cleanCpf, 'purchase', purchaseId)
  console.log(rows)
}

async function main() {
  const cpf = process.argv[2]
  if (!cpf) {
    console.error('Usage: node scripts/run-distribution-for-purchase.js <cpf>')
    process.exit(1)
  }
  await distributeForCpf(cpf)
}

main().catch((e)=>{ console.error(e); process.exit(1) })

