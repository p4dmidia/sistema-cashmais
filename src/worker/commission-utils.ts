// Utility functions for network commission distribution

interface CommissionSettings {
  level: number;
  percentage: number;
}

/**
 * Get commission settings for all levels
 */
export async function getCommissionSettings(db: D1Database): Promise<CommissionSettings[]> {
  try {
    const { results } = await db.prepare(`
      SELECT level, percentage 
      FROM system_commission_settings 
      WHERE is_active = 1 
      ORDER BY level ASC
    `).all();
    
    return results.map((r: any) => ({
      level: r.level as number,
      percentage: r.percentage as number
    }));
  } catch (error) {
    console.error('[COMMISSION_UTILS] Error getting commission settings:', error);
    return [];
  }
}

/**
 * Check if affiliate has minimum 3 direct referrals to earn network commissions
 */
export async function hasMinimumReferrals(db: D1Database, affiliateId: number): Promise<boolean> {
  try {
    const result = await db.prepare(`
      SELECT COUNT(*) as count FROM affiliates 
      WHERE sponsor_id = ? AND is_active = 1
    `).bind(affiliateId).first();
    
    const count = (result?.count as number) || 0;
    return count >= 3;
  } catch (error) {
    console.error('[COMMISSION_UTILS] Error checking minimum referrals:', error);
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
  db: D1Database,
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

    // Get customer's affiliate record - they can receive commission even if they don't have sponsor
    const customer = await db.prepare(`
      SELECT id, sponsor_id, full_name, email FROM affiliates 
      WHERE id = ? AND is_active = 1
    `).bind(customerId).first();

    if (!customer) {
      console.log('[COMMISSION_DISTRIBUTION] Customer affiliate not found:', customerId);
      return;
    }

    console.log('[COMMISSION_DISTRIBUTION] Customer found:', {
      id: (customer as any).id,
      sponsorId: (customer as any).sponsor_id,
      name: (customer as any).full_name
    });

    // Get commission settings for all levels
    const commissionSettings = await getCommissionSettings(db);
    
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

        const hasMinReferrals = currentLevel <= 1 ? true : await hasMinimumReferrals(db, currentAffiliateId);
        
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
          await db.prepare(`
            INSERT INTO commission_distributions (
              purchase_id, affiliate_id, level, 
              commission_amount, commission_percentage, base_cashback, is_blocked
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `).bind(
            purchaseId,
            currentAffiliateId,
            currentLevel,
            commissionAmount,
            levelSettings.percentage,
            baseCashback,
            0
          ).run();
          
          // Get or create user_profile for this affiliate
          let affiliateProfile = await db.prepare(`
            SELECT id FROM user_profiles WHERE mocha_user_id = ?
          `).bind(`affiliate_${currentAffiliateId}`).first();
          
          if (!affiliateProfile) {
            console.log('[COMMISSION_DISTRIBUTION] Creating user profile for affiliate:', currentAffiliateId);
            const result = await db.prepare(`
              INSERT INTO user_profiles (mocha_user_id, role, is_active)
              VALUES (?, 'affiliate', 1)
            `).bind(`affiliate_${currentAffiliateId}`).run();
            affiliateProfile = { id: result.meta.last_row_id };
          }
          
          // Update affiliate's earnings - add to both total_earnings and available_balance
          await db.prepare(`
            INSERT INTO user_settings (user_id, total_earnings, available_balance, frozen_balance, is_active_this_month)
            VALUES (?, ?, ?, ?, 1)
            ON CONFLICT(user_id) DO UPDATE SET
              total_earnings = total_earnings + excluded.total_earnings,
              available_balance = available_balance + excluded.available_balance,
              frozen_balance = frozen_balance + excluded.frozen_balance,
              is_active_this_month = 1,
              updated_at = datetime('now')
          `).bind(
            (affiliateProfile as any).id,
            commissionAmount,
            commissionAmount,
            0
          ).run();

          console.log('[COMMISSION_DISTRIBUTION] Updated affiliate earnings:', {
            affiliateId: currentAffiliateId,
            profileId: (affiliateProfile as any).id,
            amount: commissionAmount,
            level: currentLevel
          });

          const blockedRow = await db.prepare(`
            SELECT COALESCE(SUM(commission_amount), 0) as sum_blocked
            FROM commission_distributions
            WHERE affiliate_id = ? AND is_blocked = 1
          `).bind(currentAffiliateId).first();
          const sumBlocked = blockedRow ? Number((blockedRow as any).sum_blocked || 0) : 0;
          if (sumBlocked > 0) {
            await db.prepare(`
              UPDATE user_settings
              SET available_balance = available_balance + ?,
                  frozen_balance = frozen_balance - ?
              WHERE user_id = ?
            `).bind(sumBlocked, sumBlocked, (affiliateProfile as any).id).run();
            await db.prepare(`
              UPDATE commission_distributions
              SET is_blocked = 0, released_at = datetime('now')
              WHERE affiliate_id = ? AND is_blocked = 1
            `).bind(currentAffiliateId).run();
          }
        } else {
          const commissionPercentage = levelSettings.percentage / 100;
          const commissionAmount = totalDistributable * commissionPercentage;
          totalDistributed += commissionAmount;

          await db.prepare(`
            INSERT INTO commission_distributions (
              purchase_id, affiliate_id, level, 
              commission_amount, commission_percentage, base_cashback, is_blocked
            ) VALUES (?, ?, ?, ?, ?, ?, 1)
          `).bind(
            purchaseId,
            currentAffiliateId,
            currentLevel,
            commissionAmount,
            levelSettings.percentage,
            baseCashback
          ).run();

          let affiliateProfile = await db.prepare(`
            SELECT id FROM user_profiles WHERE mocha_user_id = ?
          `).bind(`affiliate_${currentAffiliateId}`).first();
          if (!affiliateProfile) {
            const result = await db.prepare(`
              INSERT INTO user_profiles (mocha_user_id, role, is_active)
              VALUES (?, 'affiliate', 1)
            `).bind(`affiliate_${currentAffiliateId}`).run();
            affiliateProfile = { id: result.meta.last_row_id };
          }
          await db.prepare(`
            INSERT INTO user_settings (user_id, total_earnings, available_balance, frozen_balance, is_active_this_month)
            VALUES (?, ?, 0, ?, 1)
            ON CONFLICT(user_id) DO UPDATE SET
              total_earnings = total_earnings + excluded.total_earnings,
              frozen_balance = frozen_balance + excluded.frozen_balance,
              is_active_this_month = 1,
              updated_at = datetime('now')
          `).bind(
            (affiliateProfile as any).id,
            commissionAmount,
            commissionAmount
          ).run();
        }
        
        // Move to next level - get current affiliate's sponsor
        if (currentLevel === 0) {
          // For level 0 (customer), move to their sponsor for level 1
          currentAffiliateId = (customer as any).sponsor_id;
        } else {
          // For levels 1+, get the sponsor of current affiliate
          const nextSponsor = await db.prepare(`
            SELECT sponsor_id FROM affiliates WHERE id = ?
          `).bind(currentAffiliateId).first();
          
          currentAffiliateId = nextSponsor ? (nextSponsor as any).sponsor_id : null;
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

    try {
      await db.prepare(`
        INSERT INTO commission_distributions (
          purchase_id, affiliate_id, level,
          commission_amount, commission_percentage, base_cashback
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        purchaseId,
        0,
        999,
        finalCashmaisShare,
        0,
        baseCashback
      ).run();
      console.log('[COMMISSION_DISTRIBUTION] Recorded CashMais receivable:', {
        purchaseId,
        amount: finalCashmaisShare
      });
    } catch (recErr) {
      console.error('[COMMISSION_DISTRIBUTION] Failed to record CashMais receivable:', recErr);
    }

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
