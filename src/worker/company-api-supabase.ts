import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { createClient } from '@supabase/supabase-js'

const app = new Hono<{ Bindings: Env }>();

// Schemas
const CompanyRegisterSchema = z.object({
  razao_social: z.string().min(1),
  nome_fantasia: z.string().min(1),
  cnpj: z.string().min(14).max(18),
  email: z.string().email(),
  telefone: z.string().min(10),
  responsavel: z.string().min(1),
  senha: z.string().min(6),
  endereco: z.string().optional(),
  site_instagram: z.string().optional(),
});

const CreateCashierSchema = z.object({
  name: z.string().min(1),
  cpf: z.string().min(11).max(14),
  password: z.string().min(6),
});

const PurchaseSchema = z.object({
  customer_coupon: z.string().min(1),
  purchase_value: z.number().min(0.01),
});

// Helper function to create Supabase client
function createSupabaseClient(c: any) {
  return createClient(
    c.env.SUPABASE_URL || 'https://hffxmntvtsimwlsapfod.supabase.co',
    c.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmZnhtbnR2dHNpbXdsc2FwZm9kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjc0NjA0OCwiZXhwIjoyMDc4MzIyMDQ4fQ.4cPUqXeAEkA5kVwDQU1pmVJoiJRoAtnPtojySH3l_mI'
  );
}

// Helper function to get company session
async function getCompanySession(c: any) {
  const sessionToken = getCookie(c, 'company_session');
  if (!sessionToken) return null;

  const supabase = createSupabaseClient(c);
  
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
}

async function getCashierSession(c: any) {
  const sessionToken = getCookie(c, 'cashier_session');
  if (!sessionToken) return null;

  const supabase = createSupabaseClient(c);
  
  const { data: session, error } = await supabase
    .from('cashier_sessions')
    .select(`
      *,
      company_cashiers!inner(*, companies!inner(nome_fantasia))
    `)
    .eq('session_token', sessionToken)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error || !session) {
    return null;
  }

  return session;
}

// Company registration
app.post('/api/empresa/registrar', async (c) => {
  try {
    const data = CompanyRegisterSchema.parse(await c.req.json());
    const supabase = createSupabaseClient(c);
    
    console.log('Company registration data received:', JSON.stringify(data, null, 2));
    
    // Check if email already exists
    const { data: existingCompany } = await supabase
      .from('companies')
      .select('id')
      .eq('email', data.email)
      .single();

    if (existingCompany) {
      return c.json({ error: 'Email já cadastrado' }, 400);
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
      return c.json({ error: 'Erro interno do servidor' }, 500);
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

    return c.json({ success: true, message: 'Empresa cadastrada com sucesso!' });
  } catch (error: any) {
    console.error('Company registration error:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

// Company login
app.post('/api/empresa/login', async (c) => {
  try {
    const body = await c.req.json();
    const supabase = createSupabaseClient(c);
    let email = '';
    let senha = '';

    // Support both email and CNPJ
    if (body.email) {
      email = body.email;
      senha = body.senha;
    } else if (body.cnpj) {
      const cleanCnpj = String(body.cnpj).replace(/\D/g, '');
      // Try with clean CNPJ first
      let { data: companyByCnpj } = await supabase
        .from('companies')
        .select('email')
        .eq('cnpj', cleanCnpj)
        .eq('is_active', true)
        .single();

      // Fallback to original masked CNPJ
      if (!companyByCnpj) {
        const fallback = await supabase
          .from('companies')
          .select('email')
          .eq('cnpj', body.cnpj)
          .eq('is_active', true)
          .single();
        companyByCnpj = fallback.data as any;
      }

      if (!companyByCnpj) {
        return c.json({ error: 'CNPJ ou senha inválidos' }, 401);
      }
      email = companyByCnpj.email;
      senha = body.senha;
    } else {
      return c.json({ error: 'Email ou CNPJ é obrigatório' }, 400);
    }
    
    // Find company
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .single();

    if (companyError || !company) {
      return c.json({ error: 'Email ou senha inválidos' }, 401);
    }

    // Verify password
    const validPassword = await bcrypt.compare(senha, company.senha_hash as string);
    if (!validPassword) {
      return c.json({ error: 'Email ou senha inválidos' }, 401);
    }

    // Create session
    const sessionToken = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
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
      return c.json({ error: 'Erro interno do servidor' }, 500);
    }

    const origin = c.req.header('Origin') || c.req.header('Host') || '';
    const isLocal = origin.includes('localhost') || origin.includes('127.0.0.1');
    const secureCookie = !isLocal;
    setCookie(c, 'company_session', sessionToken, {
      httpOnly: true,
      secure: secureCookie,
      sameSite: secureCookie ? 'None' : 'Lax',
      maxAge: 24 * 60 * 60,
      path: '/'
    });

    return c.json({ 
      success: true, 
      company: {
        id: company.id,
        razao_social: company.razao_social,
        nome_fantasia: company.nome_fantasia,
        email: company.email,
        role: 'company'
      }
    });
  } catch (error: any) {
    console.error('Company login error:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

// Cashier login
app.post('/api/caixa/login', async (c) => {
  try {
    const { cpf, password } = z.object({
      cpf: z.string().min(10),
      password: z.string().min(1)
    }).parse(await c.req.json());
    
    const supabase = createSupabaseClient(c);
    const cleanCpf = cpf.replace(/\D/g, '');
    
    // Find cashier
    let { data: cashier, error: cashierError } = await supabase
      .from('company_cashiers')
      .select(`
        *,
        companies!inner(nome_fantasia)
      `)
      .eq('cpf', cleanCpf)
      .eq('is_active', true)
      .eq('companies.is_active', true)
      .single();
    if ((!cashier || cashierError) && cpf !== cleanCpf) {
      const fallback = await supabase
        .from('company_cashiers')
        .select(`
          *,
          companies!inner(nome_fantasia)
        `)
        .eq('cpf', cpf)
        .eq('is_active', true)
        .eq('companies.is_active', true)
        .single();
      cashier = fallback.data as any;
      cashierError = fallback.error as any;
    }
    
    if (cashierError || !cashier) {
      return c.json({ error: 'CPF ou senha inválidos' }, 401);
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, cashier.password_hash as string);
    if (!validPassword) {
      return c.json({ error: 'CPF ou senha inválidos' }, 401);
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
    const sessionToken = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
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
      return c.json({ error: 'Erro interno do servidor' }, 500);
    }

    const origin = c.req.header('Origin') || c.req.header('Host') || '';
    const isLocal = origin.includes('localhost') || origin.includes('127.0.0.1');
    const secureCookie = !isLocal;
    setCookie(c, 'cashier_session', sessionToken, {
      httpOnly: true,
      secure: secureCookie,
      sameSite: secureCookie ? 'None' : 'Lax',
      maxAge: 8 * 60 * 60,
      path: '/'
    });

    return c.json({ 
      success: true, 
      cashier: {
        id: cashier.id,
        name: cashier.name,
        cpf: cashier.cpf,
        company_name: cashier.companies.nome_fantasia,
        role: 'cashier'
      }
    });
  } catch (error: any) {
    console.error('Cashier login error:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

// Check company session
app.get('/api/empresa/me', async (c) => {
  const session = await getCompanySession(c);
  if (!session) {
    return c.json({ error: 'Não autorizado' }, 401);
  }

  return c.json({
    company: {
      id: session.companies.id,
      razao_social: session.companies.razao_social,
      nome_fantasia: session.companies.nome_fantasia,
      email: session.companies.email,
      role: 'company'
    }
  });
});

// Check cashier session
app.get('/api/caixa/me', async (c) => {
  const session = await getCashierSession(c);
  if (!session) {
    return c.json({ error: 'Não autorizado' }, 401);
  }

  return c.json({
    cashier: {
      id: session.company_cashiers.id,
      name: session.company_cashiers.name,
      cpf: session.company_cashiers.cpf,
      company_name: session.company_cashiers.companies.nome_fantasia,
      role: 'cashier'
    }
  });
});

// Create cashier (company only)
app.post('/api/empresa/caixas', async (c) => {
  const session = await getCompanySession(c);
  if (!session) {
    return c.json({ error: 'Não autorizado' }, 401);
  }

  try {
    const { name, cpf, password } = CreateCashierSchema.parse(await c.req.json());
    const supabase = createSupabaseClient(c);

    // Check if CPF already exists for this company
    const { data: existingCashier } = await supabase
      .from('company_cashiers')
      .select('id')
      .eq('company_id', session.companies.id)
      .eq('cpf', cpf)
      .single();
    
    if (existingCashier) {
      return c.json({ error: 'CPF já cadastrado para esta empresa' }, 400);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    const cleanCpf = cpf.replace(/\D/g, '');
    let { data: userProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('cpf', cleanCpf)
      .eq('role', 'cashier')
      .single();

    if (!userProfile) {
      const { data: createdProfile, error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          mocha_user_id: `cashier_${cleanCpf}_${Date.now()}`,
          cpf: cleanCpf,
          role: 'cashier',
          is_active: true
        })
        .select()
        .single();
      if (profileError || !createdProfile) {
        console.error('User profile creation error:', profileError);
        return c.json({ error: 'Erro interno do servidor' }, 500);
      }
      userProfile = createdProfile;
    }

    // Create cashier
    const { error: cashierError } = await supabase
      .from('company_cashiers')
      .insert({
        company_id: session.companies.id,
        user_id: userProfile.id,
        name: name,
        cpf: cleanCpf,
        password_hash: passwordHash,
        is_active: true
      });

    if (cashierError) {
      console.error('Cashier creation error:', cashierError);
      return c.json({ error: 'Erro interno do servidor' }, 500);
    }

    return c.json({ success: true, message: 'Caixa cadastrado com sucesso!' });
  } catch (error: any) {
    console.error('Create cashier error:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

// List cashiers (company only)
app.get('/api/empresa/caixas', async (c) => {
  const session = await getCompanySession(c);
  if (!session) {
    return c.json({ error: 'Não autorizado' }, 401);
  }

  try {
    const supabase = createSupabaseClient(c);
    
    const { data: cashiers, error } = await supabase
      .from('company_cashiers')
      .select('id, name, cpf, is_active, last_access_at, created_at')
      .eq('company_id', session.companies.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('List cashiers error:', error);
      return c.json({ error: 'Erro interno do servidor' }, 500);
    }

    return c.json({ cashiers });
  } catch (error: any) {
    console.error('List cashiers error:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

// Record purchase (cashier only)
app.post('/api/caixa/compra', async (c) => {
  const session = await getCashierSession(c);
  if (!session) {
    return c.json({ error: 'Não autorizado' }, 401);
  }

  try {
    const { customer_coupon, purchase_value } = PurchaseSchema.parse(await c.req.json());
    const supabase = createSupabaseClient(c);

    // Clean CPF (remove dots and dashes)
    const cleanCpf = customer_coupon.replace(/[.-]/g, '');

    // Anti-fraud: prevent cashier from using own CPF
    const cleanCashierCpf = session.company_cashiers.cpf.replace(/[.-]/g, '');
    if (cleanCpf === cleanCashierCpf) {
      return c.json({ error: 'Você não pode usar seu próprio CPF' }, 400);
    }

    // Find customer by CPF in affiliates table first
    let { data: customer, error: customerError } = await supabase
      .from('affiliates')
      .select('id, cpf, full_name, is_active')
      .eq('cpf', cleanCpf)
      .eq('is_active', true)
      .single();

    let customerType = 'affiliate';
    let customerData = customer;

    // If not found in affiliates, try user_profiles
    if (!customer && !customerError) {
      const { data: userData, error: userError } = await supabase
        .from('user_profiles')
        .select('id, cpf, mocha_user_id, is_active')
        .eq('cpf', cleanCpf)
        .eq('is_active', true)
        .single();

      if (userData && !userError) {
        customerType = 'user';
        customerData = {
          id: userData.id,
          cpf: userData.cpf,
          full_name: userData.mocha_user_id,
          is_active: userData.is_active
        };
      }
    }

    if (!customerData) {
      return c.json({ error: 'CPF não encontrado ou cliente inativo' }, 400);
    }

    // Get cashback percentage
    const { data: config } = await supabase
      .from('company_cashback_config')
      .select('cashback_percentage')
      .eq('company_id', session.companies.id)
      .single();

    const cashbackPercentage = config?.cashback_percentage || 5.0;
    const cashbackGenerated = (purchase_value * cashbackPercentage) / 100;

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
        company_id: session.companies.id,
        cashier_id: session.company_cashiers.id,
        customer_coupon_id: customerCouponData.id,
        customer_coupon: cleanCpf,
        cashier_cpf: session.company_cashiers.cpf,
        purchase_value: purchase_value,
        cashback_percentage: cashbackPercentage,
        cashback_generated: cashbackGenerated,
        purchase_date: new Date().toISOString().split('T')[0],
        purchase_time: new Date().toTimeString().split(' ')[0]
      })
      .select()
      .single();

    if (purchaseError) {
      console.error('Record purchase error:', purchaseError);
      return c.json({ error: 'Erro interno do servidor' }, 500);
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

    return c.json({ 
      success: true, 
      message: `Compra registrada! ${customerCommissionMessage}`,
      cashback_generated: cashbackGenerated,
      customer_name: customerData.full_name
    });
  } catch (error: any) {
    console.error('Record purchase error:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

// Get purchases report (company only)
app.get('/api/empresa/relatorio', async (c) => {
  const session = await getCompanySession(c);
  if (!session) {
    return c.json({ error: 'Não autorizado' }, 401);
  }

  try {
    const supabase = createSupabaseClient(c);
    
    const { data: purchases, error } = await supabase
      .from('company_purchases')
      .select(`
        *,
        company_cashiers(name)
      `)
      .eq('company_id', session.companies.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Get purchases error:', error);
      return c.json({ error: 'Erro interno do servidor' }, 500);
    }

    return c.json({ purchases });
  } catch (error: any) {
    console.error('Get purchases error:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

// Get company statistics with monthly/total breakdown
app.get('/api/empresa/estatisticas', async (c) => {
  const session = await getCompanySession(c);
  if (!session) {
    return c.json({ error: 'Não autorizado' }, 401);
  }

  try {
    const supabase = createSupabaseClient(c);
    const currentDate = new Date();
    const currentMonth = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;
    
    // Total statistics (all time)
    const { data: totalStats, error: totalError } = await supabase
      .from('company_purchases')
      .select(`
        count(),
        sum(purchase_value),
        sum(cashback_generated)
      `)
      .eq('company_id', session.companies.id)
      .single();

    // Monthly statistics (current month)
    const { data: monthlyStats, error: monthlyError } = await supabase
      .from('company_purchases')
      .select(`
        count(),
        sum(purchase_value),
        sum(cashback_generated)
      `)
      .eq('company_id', session.companies.id)
      .gte('purchase_date', `${currentMonth}-01`)
      .lt('purchase_date', new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1).toISOString().split('T')[0])
      .single();

    // Get current cashback percentage
    const { data: cashbackConfig } = await supabase
      .from('company_cashback_config')
      .select('cashback_percentage')
      .eq('company_id', session.companies.id)
      .single();

    return c.json({
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
    });
  } catch (error: any) {
    console.error('Get company statistics error:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

// Get monthly data for charts
app.get('/api/empresa/dados-mensais', async (c) => {
  const session = await getCompanySession(c);
  if (!session) {
    return c.json({ error: 'Não autorizado' }, 401);
  }

  try {
    const supabase = createSupabaseClient(c);
    
    // Get last 6 months of data
    const { data: monthlyData, error } = await supabase
      .from('company_purchases')
      .select(`
        purchase_date,
        count(),
        sum(purchase_value),
        sum(cashback_generated)
      `)
      .eq('company_id', session.companies.id)
      .gte('purchase_date', new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('purchase_date', { ascending: true });

    if (error) {
      console.error('Get monthly data error:', error);
      return c.json({ error: 'Erro interno do servidor' }, 500);
    }

    // Format the data for better display
    const formattedData = (monthlyData || []).map(row => ({
      month: new Date(row.purchase_date + '-01').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      sales_count: row.count,
      sales_value: row.sum?.purchase_value || 0,
      cashback_generated: row.sum?.cashback_generated || 0
    }));

    return c.json({ monthly_data: formattedData });
  } catch (error: any) {
    console.error('Get monthly data error:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

// Update cashier (company only)
app.put('/api/empresa/caixas/:id', async (c) => {
  const session = await getCompanySession(c);
  if (!session) {
    return c.json({ error: 'Não autorizado' }, 401);
  }

  try {
    const cashierId = parseInt(c.req.param('id'));
    const { name, password } = await c.req.json();
    const supabase = createSupabaseClient(c);

    // Verify cashier belongs to this company
    const { data: cashier } = await supabase
      .from('company_cashiers')
      .select('id')
      .eq('id', cashierId)
      .eq('company_id', session.companies.id)
      .single();

    if (!cashier) {
      return c.json({ error: 'Caixa não encontrado' }, 404);
    }

    // Update name and password if provided
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (password && password.length >= 6) {
      const passwordHash = await bcrypt.hash(password, 10);
      updateData.name = name;
      updateData.password_hash = passwordHash;
    } else if (name) {
      updateData.name = name;
    }

    const { error } = await supabase
      .from('company_cashiers')
      .update(updateData)
      .eq('id', cashierId);

    if (error) {
      console.error('Update cashier error:', error);
      return c.json({ error: 'Erro interno do servidor' }, 500);
    }

    return c.json({ success: true, message: 'Caixa atualizado com sucesso!' });
  } catch (error: any) {
    console.error('Update cashier error:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

// Toggle cashier active status (company only)
app.patch('/api/empresa/caixas/:id/toggle', async (c) => {
  const session = await getCompanySession(c);
  if (!session) {
    return c.json({ error: 'Não autorizado' }, 401);
  }

  try {
    const cashierId = parseInt(c.req.param('id'));
    const supabase = createSupabaseClient(c);

    // Verify cashier belongs to this company
    const { data: cashier } = await supabase
      .from('company_cashiers')
      .select('id, is_active')
      .eq('id', cashierId)
      .eq('company_id', session.companies.id)
      .single();

    if (!cashier) {
      return c.json({ error: 'Caixa não encontrado' }, 404);
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
      return c.json({ error: 'Erro interno do servidor' }, 500);
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

    return c.json({ 
      success: true, 
      message: newStatus ? 'Caixa ativado com sucesso!' : 'Caixa bloqueado com sucesso!',
      is_active: newStatus
    });
  } catch (error: any) {
    console.error('Toggle cashier error:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

// Delete cashier (company only)
app.delete('/api/empresa/caixas/:id', async (c) => {
  const session = await getCompanySession(c);
  if (!session) {
    return c.json({ error: 'Não autorizado' }, 401);
  }

  try {
    const cashierId = parseInt(c.req.param('id'));
    const supabase = createSupabaseClient(c);

    // Verify cashier belongs to this company
    const { data: cashier } = await supabase
      .from('company_cashiers')
      .select('id')
      .eq('id', cashierId)
      .eq('company_id', session.companies.id)
      .single();

    if (!cashier) {
      return c.json({ error: 'Caixa não encontrado' }, 404);
    }

    // Check if cashier has any purchases
    const { count } = await supabase
      .from('company_purchases')
      .select('*', { count: 'exact', head: true })
      .eq('cashier_id', cashierId);

    if (count && count > 0) {
      return c.json({ error: 'Não é possível excluir caixa com vendas registradas. Bloqueie ao invés de excluir.' }, 400);
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
      return c.json({ error: 'Erro interno do servidor' }, 500);
    }

    return c.json({ success: true, message: 'Caixa excluído com sucesso!' });
  } catch (error: any) {
    console.error('Delete cashier error:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

// Update company cashback percentage
app.put('/api/empresa/cashback', async (c) => {
  const session = await getCompanySession(c);
  if (!session) {
    return c.json({ error: 'Não autorizado' }, 401);
  }

  try {
    const { cashback_percentage } = await c.req.json();
    const supabase = createSupabaseClient(c);
    
    if (!cashback_percentage || cashback_percentage < 1 || cashback_percentage > 20) {
      return c.json({ error: 'Percentual deve estar entre 1% e 20%' }, 400);
    }

    const { error } = await supabase
      .from('company_cashback_config')
      .update({
        cashback_percentage: cashback_percentage,
        updated_at: new Date().toISOString()
      })
      .eq('company_id', session.companies.id);

    if (error) {
      console.error('Update cashback percentage error:', error);
      return c.json({ error: 'Erro interno do servidor' }, 500);
    }

    return c.json({ success: true, message: 'Percentual de cashback atualizado com sucesso!' });
  } catch (error: any) {
    console.error('Update cashback percentage error:', error);
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});

// Logout endpoints
app.post('/api/empresa/logout', async (c) => {
  const sessionToken = getCookie(c, 'company_session');
  if (sessionToken) {
    const supabase = createSupabaseClient(c);
    const { error } = await supabase
      .from('company_sessions')
      .delete()
      .eq('session_token', sessionToken);

    if (error) {
      console.error('Company logout error:', error);
    }
  }
  deleteCookie(c, 'company_session');
  return c.json({ success: true });
});

app.post('/api/caixa/logout', async (c) => {
  const sessionToken = getCookie(c, 'cashier_session');
  if (sessionToken) {
    const supabase = createSupabaseClient(c);
    const { error } = await supabase
      .from('cashier_sessions')
      .delete()
      .eq('session_token', sessionToken);

    if (error) {
      console.error('Cashier logout error:', error);
    }
  }
  deleteCookie(c, 'cashier_session');
  return c.json({ success: true });
});

export default app;