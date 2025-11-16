import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import bcrypt from "bcryptjs";
// Using Web Crypto API for Cloudflare Workers
import { z } from "zod";
import { distributeNetworkCommissions } from "./commission-utils";

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

// Helper function to get session
async function getCompanySession(c: any) {
  const sessionToken = getCookie(c, 'company_session');
  if (!sessionToken) return null;

  const session = await c.env.DB.prepare(`
    SELECT cs.*, c.* FROM company_sessions cs
    JOIN companies c ON cs.company_id = c.id
    WHERE cs.session_token = ? AND cs.expires_at > datetime('now')
  `).bind(sessionToken).first();

  return session;
}

async function getCashierSession(c: any) {
  const sessionToken = getCookie(c, 'cashier_session');
  if (!sessionToken) return null;

  const session = await c.env.DB.prepare(`
    SELECT cs.*, cc.*, c.nome_fantasia as company_name FROM cashier_sessions cs
    JOIN company_cashiers cc ON cs.cashier_id = cc.id
    JOIN companies c ON cc.company_id = c.id
    WHERE cs.session_token = ? AND cs.expires_at > datetime('now')
  `).bind(sessionToken).first();

  return session;
}

// Company registration
app.post('/api/empresa/registrar', async (c) => {
  try {
    const data = CompanyRegisterSchema.parse(await c.req.json());
    
    console.log('Company registration data received:', JSON.stringify(data, null, 2));
    
    // Check if email already exists
    const existing = await c.env.DB.prepare('SELECT id FROM companies WHERE email = ?').bind(data.email).first();
    if (existing) {
      return c.json({ error: 'Email já cadastrado' }, 400);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.senha, 10);

    // Insert company
    const result = await c.env.DB.prepare(`
      INSERT INTO companies (razao_social, nome_fantasia, cnpj, email, telefone, responsavel, senha_hash, endereco, site_instagram)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.razao_social,
      data.nome_fantasia,
      data.cnpj,
      data.email,
      data.telefone,
      data.responsavel,
      passwordHash,
      data.endereco || '',
      data.site_instagram || ''
    ).run();

    // Debug: Log the result structure
    console.log('D1 Insert Result:', JSON.stringify(result, null, 2));
    
    // Get the company ID with proper fallback
    const companyId = result.meta?.lastRowId || result.meta?.last_row_id || (result as any).lastRowId || (result as any).last_row_id;
    
    if (!companyId) {
      console.error('Failed to get company ID from result:', result);
      throw new Error('Failed to get inserted company ID - database may not support last insert ID');
    }

    // Create cashback config
    await c.env.DB.prepare(`
      INSERT INTO company_cashback_config (company_id, cashback_percentage)
      VALUES (?, 5.0)
    `).bind(companyId).run();

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
    let email = '';
    let senha = '';

    // Suporte tanto para email quanto CNPJ
    if (body.email) {
      email = body.email;
      senha = body.senha;
    } else if (body.cnpj) {
      const cleanCnpj = String(body.cnpj).replace(/\D/g, '');
      // Try with clean CNPJ first
      let company = await c.env.DB.prepare('SELECT email FROM companies WHERE cnpj = ? AND is_active = 1').bind(cleanCnpj).first();
      // Fallback to original masked CNPJ
      if (!company) {
        company = await c.env.DB.prepare('SELECT email FROM companies WHERE cnpj = ? AND is_active = 1').bind(body.cnpj).first();
      }
      if (!company) {
        return c.json({ error: 'CNPJ ou senha inválidos' }, 401);
      }
      email = (company as any).email as string;
      senha = body.senha;
    } else {
      return c.json({ error: 'Email ou CNPJ é obrigatório' }, 400);
    }
    
    // Find company
    const company = await c.env.DB.prepare('SELECT * FROM companies WHERE email = ? AND is_active = 1').bind(email).first();
    if (!company) {
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

    await c.env.DB.prepare(`
      INSERT INTO company_sessions (company_id, session_token, expires_at)
      VALUES (?, ?, ?)
    `).bind(company.id, sessionToken, expiresAt.toISOString()).run();

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
    const cleanCpf = cpf.replace(/\D/g, '');
    
    // Find cashier
    let cashier = await c.env.DB.prepare(`
      SELECT cc.*, c.nome_fantasia as company_name FROM company_cashiers cc
      JOIN companies c ON cc.company_id = c.id
      WHERE cc.cpf = ? AND cc.is_active = 1 AND c.is_active = 1
    `).bind(cleanCpf).first();
    if (!cashier && cpf !== cleanCpf) {
      cashier = await c.env.DB.prepare(`
        SELECT cc.*, c.nome_fantasia as company_name FROM company_cashiers cc
        JOIN companies c ON cc.company_id = c.id
        WHERE cc.cpf = ? AND cc.is_active = 1 AND c.is_active = 1
      `).bind(cpf).first();
    }
    
    if (!cashier) {
      return c.json({ error: 'CPF ou senha inválidos' }, 401);
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, cashier.password_hash as string);
    if (!validPassword) {
      return c.json({ error: 'CPF ou senha inválidos' }, 401);
    }

    // Update last access
    await c.env.DB.prepare(`
      UPDATE company_cashiers SET last_access_at = datetime('now') WHERE id = ?
    `).bind(cashier.id).run();

    // Create session
    const sessionToken = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours

    await c.env.DB.prepare(`
      INSERT INTO cashier_sessions (cashier_id, session_token, expires_at)
      VALUES (?, ?, ?)
    `).bind(cashier.id, sessionToken, expiresAt.toISOString()).run();

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
        company_name: cashier.company_name,
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
      id: session.id,
      razao_social: session.razao_social,
      nome_fantasia: session.nome_fantasia,
      email: session.email,
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
      id: session.id,
      name: session.name,
      cpf: session.cpf,
      company_name: session.company_name,
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

    // Check if CPF already exists for this company
    const existing = await c.env.DB.prepare(`
      SELECT id FROM company_cashiers WHERE company_id = ? AND cpf = ?
    `).bind(session.id, cpf).first();
    
    if (existing) {
      return c.json({ error: 'CPF já cadastrado para esta empresa' }, 400);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user_profile entry for the cashier to satisfy foreign key constraint
    const userProfileResult = await c.env.DB.prepare(`
      INSERT INTO user_profiles (mocha_user_id, cpf, role, is_active)
      VALUES (?, ?, 'cashier', 1)
    `).bind(`cashier_${cleanCpf}_${Date.now()}`, cleanCpf).run();

    const userProfileId = userProfileResult.meta.last_row_id;

    // Create cashier
    await c.env.DB.prepare(`
      INSERT INTO company_cashiers (company_id, user_id, name, cpf, password_hash)
      VALUES (?, ?, ?, ?, ?)
    `).bind(session.id, userProfileId, name, cleanCpf, passwordHash).run();

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
    const cashiers = await c.env.DB.prepare(`
      SELECT id, name, cpf, is_active, last_access_at, created_at
      FROM company_cashiers
      WHERE company_id = ?
      ORDER BY created_at DESC
    `).bind(session.id).all();

    return c.json({ cashiers: cashiers.results });
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

    // Clean CPF (remove dots and dashes)
    const cleanCpf = customer_coupon.replace(/[.-]/g, '');

    // Anti-fraud: prevent cashier from using own CPF
    const cleanCashierCpf = session.cpf.replace(/[.-]/g, '');
    if (cleanCpf === cleanCashierCpf) {
      return c.json({ error: 'Você não pode usar seu próprio CPF' }, 400);
    }

    // Find customer by CPF in affiliates table first
    let customer = await c.env.DB.prepare(`
      SELECT id, cpf, full_name as name, 'affiliate' as type FROM affiliates 
      WHERE cpf = ? AND is_active = 1
    `).bind(cleanCpf).first();

    // If not found in affiliates, try user_profiles
    if (!customer) {
      customer = await c.env.DB.prepare(`
        SELECT id, cpf, mocha_user_id as name, 'user' as type FROM user_profiles 
        WHERE cpf = ? AND is_active = 1
      `).bind(cleanCpf).first();
    }

    if (!customer) {
      return c.json({ error: 'CPF não encontrado ou cliente inativo' }, 400);
    }

    // Get cashback percentage
    const config = await c.env.DB.prepare(`
      SELECT cashback_percentage FROM company_cashback_config WHERE company_id = ?
    `).bind(session.company_id).first();

    const cashbackPercentage = (config?.cashback_percentage as number) || 5.0;
    const cashbackGenerated = (purchase_value * cashbackPercentage) / 100;

    // Check if customer coupon exists, if not create one
    let customerCoupon = await c.env.DB.prepare(`
      SELECT * FROM customer_coupons WHERE cpf = ? AND is_active = 1
    `).bind(cleanCpf).first();

    if (!customerCoupon) {
      // Create customer coupon using CPF
      // CORREÇÃO: Para afiliados, precisamos usar user_profiles.id como user_id
      // Para manter foreign key constraint correta
      let userIdForCoupon = customer.id;
      
      if (customer.type === 'affiliate') {
        // Para afiliados, buscar o user_profiles.id correspondente
        const userProfile = await c.env.DB.prepare(`
          SELECT id FROM user_profiles WHERE mocha_user_id = ?
        `).bind(`affiliate_${customer.id}`).first();
        
        if (userProfile) {
          userIdForCoupon = (userProfile as any).id;
        } else {
          // Se não existir user_profile, criar um
          const profileResult = await c.env.DB.prepare(`
            INSERT INTO user_profiles (mocha_user_id, cpf, role, is_active)
            VALUES (?, ?, 'affiliate', 1)
          `).bind(`affiliate_${customer.id}`, customer.cpf || '').run();
          userIdForCoupon = profileResult.meta.last_row_id as number;
        }
      }
      
      const couponResult = await c.env.DB.prepare(`
        INSERT INTO customer_coupons (coupon_code, user_id, cpf, affiliate_id)
        VALUES (?, ?, ?, ?)
      `).bind(cleanCpf, userIdForCoupon, cleanCpf, customer.type === 'affiliate' ? customer.id : null).run();
      
      customerCoupon = await c.env.DB.prepare(`
        SELECT * FROM customer_coupons WHERE id = ?
      `).bind(couponResult.meta.last_row_id).first();
    }

    // Record purchase
    const purchaseResult = await c.env.DB.prepare(`
      INSERT INTO company_purchases (
        company_id, cashier_id, customer_coupon_id, customer_coupon,
        cashier_cpf, purchase_value, cashback_percentage, cashback_generated,
        purchase_date, purchase_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, date('now'), time('now'))
    `).bind(
      session.company_id,
      session.id,
      customerCoupon!.id,
      cleanCpf,
      session.cpf,
      purchase_value,
      cashbackPercentage,
      cashbackGenerated
    ).run();
    
    const purchaseId = purchaseResult.meta.last_row_id as number;

    // Update coupon usage
    await c.env.DB.prepare(`
      UPDATE customer_coupons 
      SET last_used_at = datetime('now'), total_usage_count = total_usage_count + 1
      WHERE id = ?
    `).bind(customerCoupon!.id).run();

    // Process affiliate commission distribution (70% of cashback distributed through network)
    if (customer.type === 'affiliate') {
      try {
        console.log('[PURCHASE] Processing affiliate commission distribution:', {
          customerId: customer.id,
          customerType: customer.type,
          cashbackGenerated
        });
        
        console.log('[PURCHASE] Starting commission distribution through sponsor network');
        
        // Distribute network commissions through the sponsor chain
        // 30% stays with CashMais, 70% is distributed through network levels
        // The affiliate who made the purchase is included in the sponsor chain distribution
        await distributeNetworkCommissions(
          c.env.DB,
          purchaseId as number,
          customer.id as number,
          customer.type as 'affiliate' | 'user',
          cashbackGenerated
        );

        console.log('[PURCHASE] Commission distribution completed');
        
      } catch (affiliateError) {
        console.error('[PURCHASE] Error processing affiliate commission distribution:', affiliateError);
        // Don't throw error - let the purchase complete even if commission distribution fails
      }
    }

    // Calculate actual commission that will be credited to customer (if affiliate)
    let customerCommissionMessage = '';
    if (customer.type === 'affiliate') {
      // Customer gets 10% of the 70% distributable amount = 7% of total cashback
      const customerCommission = cashbackGenerated * 0.70 * 0.10;
      customerCommissionMessage = `Comissão de R$ ${customerCommission.toFixed(2)} será creditada para ${customer.name} (cashback de R$ ${cashbackGenerated.toFixed(2)} gerado)`;
    } else {
      customerCommissionMessage = `Cashback de R$ ${cashbackGenerated.toFixed(2)} creditado para ${customer.name}`;
    }

    return c.json({ 
      success: true, 
      message: `Compra registrada! ${customerCommissionMessage}`,
      cashback_generated: cashbackGenerated,
      customer_name: customer.name
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
    const purchases = await c.env.DB.prepare(`
      SELECT 
        cp.*,
        cc.name as cashier_name
      FROM company_purchases cp
      JOIN company_cashiers cc ON cp.cashier_id = cc.id
      WHERE cp.company_id = ?
      ORDER BY cp.created_at DESC
      LIMIT 100
    `).bind(session.id).all();

    return c.json({ purchases: purchases.results });
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
    const currentDate = new Date();
    const currentMonth = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;
    
    // Total statistics (all time)
    const totalStats = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as total_sales,
        COALESCE(SUM(purchase_value), 0) as total_sales_value,
        COALESCE(SUM(cashback_generated), 0) as total_cashback
      FROM company_purchases 
      WHERE company_id = ?
    `).bind(session.id).first();

    // Monthly statistics (current month)
    const monthlyStats = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as monthly_sales,
        COALESCE(SUM(purchase_value), 0) as monthly_sales_value,
        COALESCE(SUM(cashback_generated), 0) as monthly_cashback
      FROM company_purchases 
      WHERE company_id = ? 
      AND strftime('%Y-%m', purchase_date) = ?
    `).bind(session.id, currentMonth).first();

    // Get current cashback percentage
    const cashbackConfig = await c.env.DB.prepare(`
      SELECT cashback_percentage FROM company_cashback_config WHERE company_id = ?
    `).bind(session.id).first();

    return c.json({
      total: {
        sales_count: (totalStats as any)?.total_sales || 0,
        sales_value: (totalStats as any)?.total_sales_value || 0,
        cashback_generated: (totalStats as any)?.total_cashback || 0
      },
      monthly: {
        sales_count: (monthlyStats as any)?.monthly_sales || 0,
        sales_value: (monthlyStats as any)?.monthly_sales_value || 0,
        cashback_generated: (monthlyStats as any)?.monthly_cashback || 0
      },
      cashback_percentage: (cashbackConfig as any)?.cashback_percentage || 5.0
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
    // Get last 6 months of data
    const monthlyData = await c.env.DB.prepare(`
      SELECT 
        strftime('%Y-%m', purchase_date) as month,
        COUNT(*) as sales_count,
        COALESCE(SUM(purchase_value), 0) as sales_value,
        COALESCE(SUM(cashback_generated), 0) as cashback_generated
      FROM company_purchases 
      WHERE company_id = ? 
      AND purchase_date >= date('now', '-6 months')
      GROUP BY strftime('%Y-%m', purchase_date)
      ORDER BY month ASC
    `).bind(session.id).all();

    // Format the data for better display
    const formattedData = (monthlyData.results as any[]).map(row => ({
      month: new Date(row.month + '-01').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      sales_count: row.sales_count,
      sales_value: row.sales_value,
      cashback_generated: row.cashback_generated
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

    // Verify cashier belongs to this company
    const cashier = await c.env.DB.prepare(`
      SELECT id FROM company_cashiers WHERE id = ? AND company_id = ?
    `).bind(cashierId, session.id).first();

    if (!cashier) {
      return c.json({ error: 'Caixa não encontrado' }, 404);
    }

    // Update name and password if provided
    if (password && password.length >= 6) {
      const passwordHash = await bcrypt.hash(password, 10);
      await c.env.DB.prepare(`
        UPDATE company_cashiers 
        SET name = ?, password_hash = ?, updated_at = datetime('now')
        WHERE id = ?
      `).bind(name, passwordHash, cashierId).run();
    } else if (name) {
      await c.env.DB.prepare(`
        UPDATE company_cashiers 
        SET name = ?, updated_at = datetime('now')
        WHERE id = ?
      `).bind(name, cashierId).run();
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

    // Verify cashier belongs to this company
    const cashier = await c.env.DB.prepare(`
      SELECT id, is_active FROM company_cashiers WHERE id = ? AND company_id = ?
    `).bind(cashierId, session.id).first();

    if (!cashier) {
      return c.json({ error: 'Caixa não encontrado' }, 404);
    }

    // Toggle active status
    const newStatus = cashier.is_active ? 0 : 1;
    await c.env.DB.prepare(`
      UPDATE company_cashiers 
      SET is_active = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(newStatus, cashierId).run();

    // Delete sessions if deactivating
    if (!newStatus) {
      await c.env.DB.prepare('DELETE FROM cashier_sessions WHERE cashier_id = ?').bind(cashierId).run();
    }

    return c.json({ 
      success: true, 
      message: newStatus ? 'Caixa ativado com sucesso!' : 'Caixa bloqueado com sucesso!',
      is_active: Boolean(newStatus)
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

    // Verify cashier belongs to this company
    const cashier = await c.env.DB.prepare(`
      SELECT id FROM company_cashiers WHERE id = ? AND company_id = ?
    `).bind(cashierId, session.id).first();

    if (!cashier) {
      return c.json({ error: 'Caixa não encontrado' }, 404);
    }

    // Check if cashier has any purchases
    const hasPurchases = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM company_purchases WHERE cashier_id = ?
    `).bind(cashierId).first();

    if ((hasPurchases as any)?.count > 0) {
      return c.json({ error: 'Não é possível excluir caixa com vendas registradas. Bloqueie ao invés de excluir.' }, 400);
    }

    // Delete sessions first
    await c.env.DB.prepare('DELETE FROM cashier_sessions WHERE cashier_id = ?').bind(cashierId).run();
    
    // Delete cashier
    await c.env.DB.prepare('DELETE FROM company_cashiers WHERE id = ?').bind(cashierId).run();

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
    
    if (!cashback_percentage || cashback_percentage < 1 || cashback_percentage > 20) {
      return c.json({ error: 'Percentual deve estar entre 1% e 20%' }, 400);
    }

    await c.env.DB.prepare(`
      UPDATE company_cashback_config 
      SET cashback_percentage = ?, updated_at = datetime('now')
      WHERE company_id = ?
    `).bind(cashback_percentage, session.id).run();

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
    await c.env.DB.prepare('DELETE FROM company_sessions WHERE session_token = ?').bind(sessionToken).run();
  }
  deleteCookie(c, 'company_session');
  return c.json({ success: true });
});

app.post('/api/caixa/logout', async (c) => {
  const sessionToken = getCookie(c, 'cashier_session');
  if (sessionToken) {
    await c.env.DB.prepare('DELETE FROM cashier_sessions WHERE session_token = ?').bind(sessionToken).run();
  }
  deleteCookie(c, 'cashier_session');
  return c.json({ success: true });
});

export default app;
