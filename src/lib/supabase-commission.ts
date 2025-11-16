import { supabase } from './supabase';

interface CommissionSettings {
  level: number;
  percentage: number;
}

/**
 * Get commission settings for all levels
 */
export async function getCommissionSettings(): Promise<CommissionSettings[]> {
  try {
    const { data: settings, error } = await supabase
      .from('system_commission_settings')
      .select('level, percentage')
      .eq('is_active', true)
      .order('level', { ascending: true });

    if (error) {
      console.error('[COMMISSION_UTILS] Error getting commission settings:', error);
      return [];
    }

    return settings.map((s: any) => ({
      level: s.level as number,
      percentage: s.percentage as number
    }));
  } catch (error) {
    console.error('[COMMISSION_UTILS] Error getting commission settings:', error);
    return [];
  }
}

/**
 * Check if affiliate has minimum 3 direct referrals to earn network commissions
 */
export async function hasMinimumReferrals(affiliateId: number): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from('affiliates')
      .select('*', { count: 'exact', head: true })
      .eq('sponsor_id', affiliateId)
      .eq('is_active', true);

    if (error) {
      console.error('[COMMISSION_UTILS] Error checking minimum referrals:', error);
      return false;
    }

    return (count || 0) >= 3;
  } catch (error) {
    console.error('[COMMISSION_UTILS] Error checking minimum referrals:', error);
    return false;
  }
}

/**
 * Get affiliate by ID
 */
export async function getAffiliateById(affiliateId: number) {
  try {
    const { data: affiliate, error } = await supabase
      .from('affiliates')
      .select('id, sponsor_id, full_name, email')
      .eq('id', affiliateId)
      .eq('is_active', true)
      .single();

    if (error || !affiliate) {
      console.error('[COMMISSION_UTILS] Affiliate not found:', affiliateId);
      return null;
    }

    return affiliate;
  } catch (error) {
    console.error('[COMMISSION_UTILS] Error getting affiliate:', error);
    return null;
  }
}

/**
 * Get sponsor of an affiliate
 */
export async function getAffiliateSponsor(affiliateId: number) {
  try {
    const { data: sponsor, error } = await supabase
      .from('affiliates')
      .select('sponsor_id')
      .eq('id', affiliateId)
      .single();

    if (error || !sponsor) {
      console.error('[COMMISSION_UTILS] Error getting sponsor for affiliate:', affiliateId);
      return null;
    }

    return sponsor.sponsor_id;
  } catch (error) {
    console.error('[COMMISSION_UTILS] Error getting sponsor:', error);
    return null;
  }
}

/**
 * Get or create user profile for affiliate
 */
export async function getOrCreateUserProfile(affiliateId: number) {
  try {
    const mochaUserId = `affiliate_${affiliateId}`;

    // Try to get existing profile
    const { data: profile, error: getError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('mocha_user_id', mochaUserId)
      .single();

    if (profile) {
      return profile;
    }

    // Create new profile if not found
    const { data: newProfile, error: createError } = await supabase
      .from('user_profiles')
      .insert({
        mocha_user_id: mochaUserId,
        role: 'affiliate',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (createError) {
      console.error('[COMMISSION_UTILS] Error creating user profile:', createError);
      return null;
    }

    return newProfile;
  } catch (error) {
    console.error('[COMMISSION_UTILS] Error getting/creating user profile:', error);
    return null;
  }
}

/**
 * Record commission distribution
 */
export async function recordCommissionDistribution(
  purchaseId: number,
  affiliateId: number,
  level: number,
  commissionAmount: number,
  commissionPercentage: number,
  baseCashback: number
) {
  try {
    const { data, error } = await supabase
      .from('commission_distributions')
      .insert({
        purchase_id: purchaseId,
        affiliate_id: affiliateId,
        level,
        commission_amount: commissionAmount,
        commission_percentage: commissionPercentage,
        base_cashback: baseCashback,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('[COMMISSION_UTILS] Error recording commission distribution:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[COMMISSION_UTILS] Error recording commission distribution:', error);
    return false;
  }
}

/**
 * Update affiliate earnings
 */
export async function updateAffiliateEarnings(userId: number, commissionAmount: number) {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        total_earnings: commissionAmount,
        available_balance: commissionAmount,
        is_active_this_month: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) {
      console.error('[COMMISSION_UTILS] Error updating affiliate earnings:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[COMMISSION_UTILS] Error updating affiliate earnings:', error);
    return false;
  }
}

/**
 * Distribute network commissions through 10 levels
 * This function handles the entire network distribution logic following business rules:
 * - 30% stays with CashMais platform
 * - 70% distributed through network based on configured percentages
 * - Affiliates must have 3+ direct referrals to earn commissions
 * - Distribution goes up to 10 levels
 * - IMPORTANT: The affiliate who made the purchase gets their commission through the sponsor chain
 */
export async function distributeNetworkCommissions(
  purchaseId: number,
  customerId: number,
  customerType: 'affiliate' | 'user',
  baseCashback: number
): Promise<void> {
  try {
    console.log('[COMMISSION_DISTRIBUTION] Starting distribution:', {
      purchaseId,
      customerId,
      customerType,
      baseCashback
    });

    // Only distribute if customer is an affiliate
    if (customerType !== 'affiliate') {
      console.log('[COMMISSION_DISTRIBUTION] Skipping - customer is not an affiliate');
      return;
    }

    // Get customer's affiliate record
    const customer = await getAffiliateById(customerId);
    if (!customer) {
      console.log('[COMMISSION_DISTRIBUTION] Customer affiliate not found:', customerId);
      return;
    }

    console.log('[COMMISSION_DISTRIBUTION] Customer found:', {
      id: customer.id,
      sponsorId: customer.sponsor_id,
      name: customer.full_name
    });

    // Get commission settings for all levels
    const commissionSettings = await getCommissionSettings();
    
    if (commissionSettings.length === 0) {
      console.error('[COMMISSION_DISTRIBUTION] No commission settings found - aborting distribution');
      return;
    }

    console.log('[COMMISSION_DISTRIBUTION] Commission settings loaded:', commissionSettings.length);

    // Calculate total distributable amount (70% of base cashback)
    const totalDistributable = baseCashback * 0.70;
    
    console.log('[COMMISSION_DISTRIBUTION] Distributable amount calculated:', {
      baseCashback,
      totalDistributable,
      cashmaisShare: baseCashback * 0.30
    });

    // Track total distributed to calculate what goes back to CashMais
    let totalDistributed = 0;

    // Start distribution - Level 0 is the customer who made the purchase
    let currentAffiliateId = customerId;
    let currentLevel = 0;
    
    // Process up to 10 levels (0 = customer, 1-9 = sponsors)
    while (currentAffiliateId && currentLevel < 10) {
      try {
        console.log('[COMMISSION_DISTRIBUTION] Processing level:', {
          level: currentLevel,
          affiliateId: currentAffiliateId
        });

        // Get commission percentage for this level (level 0 uses level 1 settings)
        const settingsLevel = currentLevel === 0 ? 1 : currentLevel;
        const levelSettings = commissionSettings.find(s => s.level === settingsLevel);
        if (!levelSettings) {
          console.log('[COMMISSION_DISTRIBUTION] No settings for level:', settingsLevel);
          break;
        }

        // Check if this affiliate has minimum 3 direct referrals to earn commission
        // EXCEPTION: Level 0 (the customer who made the purchase) ALWAYS receives commission
        const hasMinReferrals = currentLevel === 0 ? true : await hasMinimumReferrals(currentAffiliateId);
        
        console.log('[COMMISSION_DISTRIBUTION] Affiliate referral check:', {
          affiliateId: currentAffiliateId,
          level: currentLevel,
          hasMinReferrals,
          isCustomerLevel: currentLevel === 0
        });

        if (hasMinReferrals) {
          // Calculate commission for this level
          const commissionPercentage = levelSettings.percentage / 100;
          const commissionAmount = totalDistributable * commissionPercentage;
          totalDistributed += commissionAmount;
          
          console.log('[COMMISSION_DISTRIBUTION] Recording commission:', {
            affiliateId: currentAffiliateId,
            level: currentLevel,
            percentage: levelSettings.percentage,
            amount: commissionAmount
          });

          // Record the commission distribution
          const recorded = await recordCommissionDistribution(
            purchaseId,
            currentAffiliateId,
            currentLevel,
            commissionAmount,
            levelSettings.percentage,
            baseCashback
          );

          if (recorded) {
            // Get or create user profile for this affiliate
            const affiliateProfile = await getOrCreateUserProfile(currentAffiliateId);
            
            if (affiliateProfile) {
              // Update affiliate's earnings
              const updated = await updateAffiliateEarnings(affiliateProfile.id, commissionAmount);
              
              if (updated) {
                console.log('[COMMISSION_DISTRIBUTION] Updated affiliate earnings:', {
                  affiliateId: currentAffiliateId,
                  profileId: affiliateProfile.id,
                  amount: commissionAmount,
                  level: currentLevel
                });
              }
            }
          }
        } else {
          console.log('[COMMISSION_DISTRIBUTION] Affiliate does not meet minimum referral requirement:', {
            affiliateId: currentAffiliateId,
            level: currentLevel
          });
        }
        
        // Move to next level - get current affiliate's sponsor
        if (currentLevel === 0) {
          // For level 0 (customer), move to their sponsor for level 1
          currentAffiliateId = customer.sponsor_id;
        } else {
          // For levels 1+, get the sponsor of current affiliate
          currentAffiliateId = await getAffiliateSponsor(currentAffiliateId);
        }
        
        currentLevel++;
        
        if (!currentAffiliateId) {
          console.log('[COMMISSION_DISTRIBUTION] Chain ended - no more sponsors at level:', currentLevel);
          break;
        }
        
      } catch (levelError) {
        console.error('[COMMISSION_DISTRIBUTION] Error processing level:', {
          level: currentLevel,
          affiliateId: currentAffiliateId,
          error: levelError
        });
        break; // Stop distribution on error but don't fail the whole transaction
      }
    }

    // Calculate undistributed amount (goes back to CashMais)
    const undistributed = totalDistributable - totalDistributed;
    const finalCashmaisShare = (baseCashback * 0.30) + undistributed;

    console.log('[COMMISSION_DISTRIBUTION] Distribution summary:', {
      totalCashback: baseCashback,
      totalDistributable: totalDistributable,
      totalDistributed,
      undistributed,
      finalCashmaisShare,
      cashmaisPercentage: (finalCashmaisShare / baseCashback) * 100
    });

    console.log('[COMMISSION_DISTRIBUTION] Distribution completed successfully');
    
  } catch (error) {
    console.error('[COMMISSION_DISTRIBUTION] Critical error in commission distribution:', error);
    // Don't throw - let the purchase complete even if commission distribution fails
  }
}

/**
 * Validate commission settings to ensure they sum to 100%
 */
export function validateCommissionSettings(settings: CommissionSettings[]): boolean {
  const total = settings.reduce((sum, s) => sum + s.percentage, 0);
  // Allow small floating point tolerance
  return Math.abs(total - 100.0) < 0.01;
}