import { supabase } from './supabase';
import bcrypt from 'bcryptjs';

// Company registration
export async function registerCompany(data: {
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  email: string;
  telefone: string;
  responsavel: string;
  senha: string;
  endereco?: string;
  site_instagram?: string;
}) {
  try {
    // Check if email already exists
    const { data: existingCompany } = await supabase
      .from('companies')
      .select('id')
      .eq('email', data.email)
      .single();

    if (existingCompany) {
      return { error: 'Email já cadastrado' };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.senha, 10);

    // Insert company
    const { data: newCompany, error: companyError } = await supabase
      .from('companies')
      .insert({
        razao_social: data.razao_social,
        nome_fantasia: data.nome_fantasia,
        cnpj: data.cnpj,
        email: data.email,
        telefone: data.telefone,
        responsavel: data.responsavel,
        senha_hash: passwordHash,
        endereco: data.endereco || '',
        site_instagram: data.site_instagram || '',
        is_active: true
      })
      .select()
      .single();

    if (companyError) {
      console.error('Company registration error:', companyError);
      return { error: 'Erro interno do servidor' };
    }

    // Create cashback config
    const { error: configError } = await supabase
      .from('company_cashback_config')
      .insert({
        company_id: newCompany.id,
        cashback_percentage: 5.0
      });

    if (configError) {
      console.error('Cashback config creation error:', configError);
      // Don't fail the whole operation if config creation fails
    }

    return { success: true, message: 'Empresa cadastrada com sucesso!' };
  } catch (error: any) {
    console.error('Company registration error:', error);
    return { error: 'Erro interno do servidor' };
  }
}

// Company login
export async function loginCompany(credentials: { email?: string; cnpj?: string; senha: string }) {
  try {
    let email = '';
    let senha = '';

    // Support both email and CNPJ
    if (credentials.email) {
      email = credentials.email;
      senha = credentials.senha;
    } else if (credentials.cnpj) {
      // If CNPJ is provided, find the corresponding email
      const { data: companyByCnpj } = await supabase
        .from('companies')
        .select('email')
        .eq('cnpj', credentials.cnpj)
        .eq('is_active', true)
        .single();

      if (!companyByCnpj) {
        return { error: 'CNPJ ou senha inválidos' };
      }
      email = companyByCnpj.email;
      senha = credentials.senha;
    } else {
      return { error: 'Email ou CNPJ é obrigatório' };
    }

    // Find company
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .single();

    if (companyError || !company) {
      return { error: 'Email ou senha inválidos' };
    }

    // Verify password
    const validPassword = await bcrypt.compare(senha, company.senha_hash);
    if (!validPassword) {
      return { error: 'Email ou senha inválidos' };
    }

    // Create session
    const sessionToken = crypto.randomUUID() + "-" + Date.now();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const { error: sessionError } = await supabase
      .from('company_sessions')
      .insert({
        company_id: company.id,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString()
      });

    if (sessionError) {
      console.error('Session creation error:', sessionError);
      return { error: 'Erro interno do servidor' };
    }

    return { 
      success: true, 
      sessionToken,
      company: {
        id: company.id,
        razao_social: company.razao_social,
        nome_fantasia: company.nome_fantasia,
        email: company.email,
        role: 'company'
      }
    };
  } catch (error: any) {
    console.error('Company login error:', error);
    return { error: 'Erro interno do servidor' };
  }
}

// Cashier login
export async function loginCashier(cpf: string, password: string) {
  try {
    // Find cashier
    const { data: cashier, error: cashierError } = await supabase
      .from('company_cashiers')
      .select(`
        *,
        companies!inner(nome_fantasia)
      `)
      .eq('cpf', cpf)
      .eq('is_active', true)
      .eq('companies.is_active', true)
      .single();

    if (cashierError || !cashier) {
      return { error: 'CPF ou senha inválidos' };
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, cashier.password_hash);
    if (!validPassword) {
      return { error: 'CPF ou senha inválidos' };
    }

    // Update last access
    const { error: updateError } = await supabase
      .from('company_cashiers')
      .update({ last_access_at: new Date().toISOString() })
      .eq('id', cashier.id);

    if (updateError) {
      console.error('Cashier last access update error:', updateError);
    }

    // Create session
    const sessionToken = crypto.randomUUID() + "-" + Date.now();
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours

    const { error: sessionError } = await supabase
      .from('cashier_sessions')
      .insert({
        cashier_id: cashier.id,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString()
      });

    if (sessionError) {
      console.error('Cashier session creation error:', sessionError);
      return { error: 'Erro interno do servidor' };
    }

    return { 
      success: true, 
      sessionToken,
      cashier: {
        id: cashier.id,
        name: cashier.name,
        cpf: cashier.cpf,
        company_name: cashier.companies.nome_fantasia,
        role: 'cashier'
      }
    };
  } catch (error: any) {
    console.error('Cashier login error:', error);
    return { error: 'Erro interno do servidor' };
  }
}

// Get company session
export async function getCompanySession(sessionToken: string) {
  try {
    const { data: session, error } = await supabase
      .from('company_sessions')
      .select(`
        *,
        companies!inner(*)
      `)
      .eq('session_token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !session) {
      return null;
    }

    return session;
  } catch (error) {
    console.error('Get company session error:', error);
    return null;
  }
}

// Get cashier session
export async function getCashierSession(sessionToken: string) {
  try {
    const { data: session, error } = await supabase
      .from('cashier_sessions')
      .select(`
        *,
        company_cashiers!inner(*),
        companies!inner(nome_fantasia)
      `)
      .eq('session_token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !session) {
      return null;
    }

    return session;
  } catch (error) {
    console.error('Get cashier session error:', error);
    return null;
  }
}

// Create cashier
export async function createCashier(companyId: number, name: string, cpf: string, password: string) {
  try {
    // Check if CPF already exists for this company
    const { data: existingCashier } = await supabase
      .from('company_cashiers')
      .select('id')
      .eq('company_id', companyId)
      .eq('cpf', cpf)
      .single();

    if (existingCashier) {
      return { error: 'CPF já cadastrado para esta empresa' };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user_profile entry for the cashier to satisfy foreign key constraint
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        mocha_user_id: `cashier_${cpf}_${Date.now()}`,
        cpf: cpf,
        role: 'cashier',
        is_active: true
      })
      .select()
      .single();

    if (profileError) {
      console.error('User profile creation error:', profileError);
      return { error: 'Erro interno do servidor' };
    }

    // Create cashier
    const { error: cashierError } = await supabase
      .from('company_cashiers')
      .insert({
        company_id: companyId,
        user_id: userProfile.id,
        name: name,
        cpf: cpf,
        password_hash: passwordHash,
        is_active: true
      });

    if (cashierError) {
      console.error('Cashier creation error:', cashierError);
      return { error: 'Erro interno do servidor' };
    }

    return { success: true, message: 'Caixa cadastrado com sucesso!' };
  } catch (error: any) {
    console.error('Create cashier error:', error);
    return { error: 'Erro interno do servidor' };
  }
}

// List cashiers
export async function listCashiers(companyId: number) {
  try {
    const { data: cashiers, error } = await supabase
      .from('company_cashiers')
      .select('id, name, cpf, is_active, last_access_at, created_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('List cashiers error:', error);
      return { error: 'Erro interno do servidor' };
    }

    return { cashiers };
  } catch (error: any) {
    console.error('List cashiers error:', error);
    return { error: 'Erro interno do servidor' };
  }
}

// Record purchase
export async function recordPurchase(cashierId: number, customerCoupon: string, purchaseValue: number) {
  try {
    // Clean CPF (remove dots and dashes)
    const cleanCpf = customerCoupon.replace(/[.-]/g, '');

    // Get cashier info first
    const { data: cashier } = await supabase
      .from('company_cashiers')
      .select('*, companies!inner(*)')
      .eq('id', cashierId)
      .single();

    if (!cashier) {
      return { error: 'Caixa não encontrado' };
    }

    // Anti-fraud: prevent cashier from using own CPF
    const cleanCashierCpf = cashier.cpf.replace(/[.-]/g, '');
    if (cleanCpf === cleanCashierCpf) {
      return { error: 'Você não pode usar seu próprio CPF' };
    }

    // Find customer by CPF in affiliates table first
    let customer = await supabase
      .from('affiliates')
      .select('id, cpf, full_name, is_active')
      .eq('cpf', cleanCpf)
      .eq('is_active', true)
      .single();

    let customerType = 'affiliate';
    let customerData = customer.data;

    // If not found in affiliates, try user_profiles
    if (!customer.data) {
      const userResult = await supabase
        .from('user_profiles')
        .select('id, cpf, mocha_user_id, is_active')
        .eq('cpf', cleanCpf)
        .eq('is_active', true)
        .single();

      if (userResult.data) {
        customerType = 'user';
        customerData = {
          id: userResult.data.id,
          cpf: userResult.data.cpf,
          full_name: userResult.data.mocha_user_id,
          is_active: userResult.data.is_active
        };
      }
    }

    if (!customerData) {
      return { error: 'CPF não encontrado ou cliente inativo' };
    }

    // Get cashback percentage
    const { data: config } = await supabase
      .from('company_cashback_config')
      .select('cashback_percentage')
      .eq('company_id', cashier.companies.id)
      .single();

    const cashbackPercentage = config?.cashback_percentage || 5.0;
    const cashbackGenerated = (purchaseValue * cashbackPercentage) / 100;

    // Check if customer coupon exists, if not create one
    let { data: customerCouponData } = await supabase
      .from('customer_coupons')
      .select('*')
      .eq('cpf', cleanCpf)
      .eq('is_active', true)
      .single();

    if (!customerCouponData) {
      // Create customer coupon using CPF
      let userIdForCoupon = customerData.id;
      
      if (customerType === 'affiliate') {
        // For affiliates, find the corresponding user_profiles.id
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('mocha_user_id', `affiliate_${customerData.id}`)
          .single();
        
        if (userProfile) {
          userIdForCoupon = userProfile.id;
        } else {
          // If no user_profile exists, create one
          const { data: newProfile } = await supabase
            .from('user_profiles')
            .insert({
              mocha_user_id: `affiliate_${customerData.id}`,
              cpf: customerData.cpf,
              role: 'affiliate',
              is_active: true
            })
            .select()
            .single();
          
          if (newProfile) {
            userIdForCoupon = newProfile.id;
          }
        }
      }
      
      const { data: newCoupon } = await supabase
        .from('customer_coupons')
        .insert({
          coupon_code: cleanCpf,
          user_id: userIdForCoupon,
          cpf: cleanCpf,
          affiliate_id: customerType === 'affiliate' ? customerData.id : null,
          is_active: true
        })
        .select()
        .single();
      
      customerCouponData = newCoupon;
    }

    // Record purchase
    const { data: purchase, error: purchaseError } = await supabase
      .from('company_purchases')
      .insert({
        company_id: cashier.companies.id,
        cashier_id: cashierId,
        customer_coupon_id: customerCouponData.id,
        customer_coupon: cleanCpf,
        cashier_cpf: cashier.cpf,
        purchase_value: purchaseValue,
        cashback_percentage: cashbackPercentage,
        cashback_generated: cashbackGenerated,
        purchase_date: new Date().toISOString().split('T')[0],
        purchase_time: new Date().toTimeString().split(' ')[0]
      })
      .select()
      .single();

    if (purchaseError) {
      console.error('Record purchase error:', purchaseError);
      return { error: 'Erro interno do servidor' };
    }

    // Update coupon usage
    const { error: couponError } = await supabase
      .from('customer_coupons')
      .update({
        last_used_at: new Date().toISOString(),
        total_usage_count: (customerCouponData.total_usage_count || 0) + 1
      })
      .eq('id', customerCouponData.id);

    if (couponError) {
      console.error('Coupon usage update error:', couponError);
    }

    // Calculate actual commission that will be credited to customer (if affiliate)
    let customerCommissionMessage = '';
    if (customerType === 'affiliate') {
      // Customer gets 10% of the 70% distributable amount = 7% of total cashback
      const customerCommission = cashbackGenerated * 0.70 * 0.10;
      customerCommissionMessage = `Comissão de R$ ${customerCommission.toFixed(2)} será creditada para ${customerData.full_name} (cashback de R$ ${cashbackGenerated.toFixed(2)} gerado)`;
    } else {
      customerCommissionMessage = `Cashback de R$ ${cashbackGenerated.toFixed(2)} creditado para ${customerData.full_name}`;
    }

    return { 
      success: true, 
      message: `Compra registrada! ${customerCommissionMessage}`,
      cashback_generated: cashbackGenerated,
      customer_name: customerData.full_name
    };
  } catch (error: any) {
    console.error('Record purchase error:', error);
    return { error: 'Erro interno do servidor' };
  }
}

// Get purchases report
export async function getCompanyPurchases(companyId: number) {
  try {
    const { data: purchases, error } = await supabase
      .from('company_purchases')
      .select(`
        *,
        company_cashiers(name)
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Get purchases error:', error);
      return { error: 'Erro interno do servidor' };
    }

    return { purchases };
  } catch (error: any) {
    console.error('Get purchases error:', error);
    return { error: 'Erro interno do servidor' };
  }
}

// Get company statistics
export async function getCompanyStatistics(companyId: number) {
  try {
    const currentDate = new Date();
    const currentMonth = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;
    
    // Total statistics (all time)
    const { data: totalStats } = await supabase
      .from('company_purchases')
      .select(`
        count(),
        sum(purchase_value),
        sum(cashback_generated)
      `)
      .eq('company_id', companyId)
      .single();

    // Monthly statistics (current month)
    const { data: monthlyStats } = await supabase
      .from('company_purchases')
      .select(`
        count(),
        sum(purchase_value),
        sum(cashback_generated)
      `)
      .eq('company_id', companyId)
      .filter('purchase_date', 'gte', `${currentMonth}-01`)
      .filter('purchase_date', 'lt', new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1).toISOString().split('T')[0])
      .single();

    // Get current cashback percentage
    const { data: cashbackConfig } = await supabase
      .from('company_cashback_config')
      .select('cashback_percentage')
      .eq('company_id', companyId)
      .single();

    return {
      total: {
        sales_count: totalStats?.count || 0,
        sales_value: totalStats?.sum?.purchase_value || 0,
        cashback_generated: totalStats?.sum?.cashback_generated || 0
      },
      monthly: {
        sales_count: monthlyStats?.count || 0,
        sales_value: monthlyStats?.sum?.purchase_value || 0,
        cashback_generated: monthlyStats?.sum?.cashback_generated || 0
      },
      cashback_percentage: cashbackConfig?.cashback_percentage || 5.0
    };
  } catch (error: any) {
    console.error('Get company statistics error:', error);
    return { error: 'Erro interno do servidor' };
  }
}

// Get monthly data for charts
export async function getCompanyMonthlyData(companyId: number) {
  try {
    // Get last 6 months of data
    const { data: monthlyData } = await supabase
      .from('company_purchases')
      .select(`
        purchase_date,
        count(),
        sum(purchase_value),
        sum(cashback_generated)
      `)
      .eq('company_id', companyId)
      .gte('purchase_date', new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('purchase_date', { ascending: true });

    // Format the data for better display
    const formattedData = (monthlyData || []).map(row => ({
      month: new Date(row.purchase_date + '-01').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      sales_count: row.count,
      sales_value: row.sum?.purchase_value || 0,
      cashback_generated: row.sum?.cashback_generated || 0
    }));

    return { monthly_data: formattedData };
  } catch (error: any) {
    console.error('Get monthly data error:', error);
    return { error: 'Erro interno do servidor' };
  }
}

// Update cashier
export async function updateCashier(companyId: number, cashierId: number, updates: { name?: string; password?: string }) {
  try {
    // Verify cashier belongs to this company
    const { data: cashier } = await supabase
      .from('company_cashiers')
      .select('id')
      .eq('id', cashierId)
      .eq('company_id', companyId)
      .single();

    if (!cashier) {
      return { error: 'Caixa não encontrado' };
    }

    // Update name and password if provided
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (updates.password && updates.password.length >= 6) {
      const passwordHash = await bcrypt.hash(updates.password, 10);
      updateData.name = updates.name;
      updateData.password_hash = passwordHash;
    } else if (updates.name) {
      updateData.name = updates.name;
    }

    const { error } = await supabase
      .from('company_cashiers')
      .update(updateData)
      .eq('id', cashierId);

    if (error) {
      console.error('Update cashier error:', error);
      return { error: 'Erro interno do servidor' };
    }

    return { success: true, message: 'Caixa atualizado com sucesso!' };
  } catch (error: any) {
    console.error('Update cashier error:', error);
    return { error: 'Erro interno do servidor' };
  }
}

// Toggle cashier active status
export async function toggleCashierStatus(companyId: number, cashierId: number) {
  try {
    // Verify cashier belongs to this company
    const { data: cashier } = await supabase
      .from('company_cashiers')
      .select('id, is_active')
      .eq('id', cashierId)
      .eq('company_id', companyId)
      .single();

    if (!cashier) {
      return { error: 'Caixa não encontrado' };
    }

    // Toggle active status
    const newStatus = !cashier.is_active;
    
    const { error: updateError } = await supabase
      .from('company_cashiers')
      .update({
        is_active: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', cashierId);

    if (updateError) {
      console.error('Toggle cashier status error:', updateError);
      return { error: 'Erro interno do servidor' };
    }

    // Delete sessions if deactivating
    if (!newStatus) {
      const { error: deleteError } = await supabase
        .from('cashier_sessions')
        .delete()
        .eq('cashier_id', cashierId);

      if (deleteError) {
        console.error('Delete cashier sessions error:', deleteError);
      }
    }

    return { 
      success: true, 
      message: newStatus ? 'Caixa ativado com sucesso!' : 'Caixa bloqueado com sucesso!',
      is_active: newStatus
    };
  } catch (error: any) {
    console.error('Toggle cashier status error:', error);
    return { error: 'Erro interno do servidor' };
  }
}

// Delete cashier
export async function deleteCashier(companyId: number, cashierId: number) {
  try {
    // Verify cashier belongs to this company
    const { data: cashier } = await supabase
      .from('company_cashiers')
      .select('id')
      .eq('id', cashierId)
      .eq('company_id', companyId)
      .single();

    if (!cashier) {
      return { error: 'Caixa não encontrado' };
    }

    // Check if cashier has any purchases
    const { count } = await supabase
      .from('company_purchases')
      .select('*', { count: 'exact', head: true })
      .eq('cashier_id', cashierId);

    if (count && count > 0) {
      return { error: 'Não é possível excluir caixa com vendas registradas. Bloqueie ao invés de excluir.' };
    }

    // Delete sessions first
    const { error: deleteSessionsError } = await supabase
      .from('cashier_sessions')
      .delete()
      .eq('cashier_id', cashierId);

    if (deleteSessionsError) {
      console.error('Delete cashier sessions error:', deleteSessionsError);
    }

    // Delete cashier
    const { error: deleteError } = await supabase
      .from('company_cashiers')
      .delete()
      .eq('id', cashierId);

    if (deleteError) {
      console.error('Delete cashier error:', deleteError);
      return { error: 'Erro interno do servidor' };
    }

    return { success: true, message: 'Caixa excluído com sucesso!' };
  } catch (error: any) {
    console.error('Delete cashier error:', error);
    return { error: 'Erro interno do servidor' };
  }
}

// Update company cashback percentage
export async function updateCompanyCashbackPercentage(companyId: number, cashbackPercentage: number) {
  try {
    if (!cashbackPercentage || cashbackPercentage < 1 || cashbackPercentage > 20) {
      return { error: 'Percentual deve estar entre 1% e 20%' };
    }

    const { error } = await supabase
      .from('company_cashback_config')
      .update({
        cashback_percentage: cashbackPercentage,
        updated_at: new Date().toISOString()
      })
      .eq('company_id', companyId);

    if (error) {
      console.error('Update cashback percentage error:', error);
      return { error: 'Erro interno do servidor' };
    }

    return { success: true, message: 'Percentual de cashback atualizado com sucesso!' };
  } catch (error: any) {
    console.error('Update cashback percentage error:', error);
    return { error: 'Erro interno do servidor' };
  }
}

// Company logout
export async function companyLogout(sessionToken: string) {
  try {
    if (sessionToken) {
      const { error } = await supabase
        .from('company_sessions')
        .delete()
        .eq('session_token', sessionToken);

      if (error) {
        console.error('Company logout error:', error);
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('Company logout error:', error);
    return { error: 'Erro interno do servidor' };
  }
}

// Cashier logout
export async function cashierLogout(sessionToken: string) {
  try {
    if (sessionToken) {
      const { error } = await supabase
        .from('cashier_sessions')
        .delete()
        .eq('session_token', sessionToken);

      if (error) {
        console.error('Cashier logout error:', error);
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('Cashier logout error:', error);
    return { error: 'Erro interno do servidor' };
  }
}