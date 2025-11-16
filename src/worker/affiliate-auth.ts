import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { setCookie, getCookie, deleteCookie } from "hono/cookie";
import bcrypt from "bcryptjs";
import { createClient } from '@supabase/supabase-js';
import "./types";

const app = new Hono<{ Bindings: Env }>();

// Validation schemas
const AffiliateRegisterSchema = z.object({
  full_name: z.string().min(1, "Nome completo é obrigatório"),
  cpf: z.string().regex(/^\d{11}$/, "CPF deve ter 11 dígitos"),
  email: z.string().email("Email inválido"),
  whatsapp: z.string().nullable().optional(),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  referral_code: z.string().nullable().optional(),
});

const AffiliateLoginSchema = z.object({
  cpf: z.string().min(11, "CPF deve ter pelo menos 11 caracteres"),
  password: z.string().min(1, "Senha é obrigatória"),
});

const PasswordForgotSchema = z.object({
  identifier: z.string().min(1, "E-mail ou CPF é obrigatório"),
});

const PasswordResetSchema = z.object({
  token: z.string().min(1, "Token é obrigatório"),
  newPassword: z.string().min(6, "Nova senha deve ter pelo menos 6 caracteres"),
});

// Utility functions
function generateSessionToken(): string {
  return crypto.randomUUID() + '-' + Date.now().toString(36);
}

function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function getSessionExpiration(): Date {
  const expires = new Date();
  expires.setDate(expires.getDate() + 30); // 30 days
  return expires;
}

// CPF validation function
function validateCPF(cpf: string): boolean {
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false; // All same digits

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.charAt(9))) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.charAt(10))) return false;

  return true;
}

// Affiliate registration
app.post("/api/affiliate/register", zValidator("json", AffiliateRegisterSchema), async (c) => {
  const data = c.req.valid("json");
  const clientIP = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';

  try {
    // Create Supabase client with service role for server-side writes
    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

    // Validate CPF
    if (!validateCPF(data.cpf)) {
      return c.json({ 
        field_errors: { 
          cpf: "CPF inválido" 
        } 
      }, 400);
    }

    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(data.password, saltRounds);

    const cleanCpf = data.cpf.replace(/\D/g, '');
    const cleanWhatsapp = (data.whatsapp || '').replace(/\D/g, '');

    const { data: existingCpf } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('cpf', cleanCpf)
      .single();

    if (existingCpf) {
      return c.json({ field: "cpf", error: "CPF já está cadastrado" }, 409);
    }

    // Skip local DB checks; work only with Supabase

    // user_profiles não possui e-mail; validação de e-mail duplicado será tratada futuramente

    let sponsorId: number | null = null;
    // Resolve sponsor by referral code if provided
    if (data.referral_code) {
      const { data: sponsor } = await supabase
        .from('affiliates')
        .select('id')
        .eq('referral_code', data.referral_code)
        .single();
      if (sponsor) {
        sponsorId = sponsor.id as number;
      }
    }

    let referralCode: string | undefined;
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 10) {
      referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const { data: existingCode } = await supabase
        .from('affiliates')
        .select('id')
        .eq('referral_code', referralCode)
        .single();
      if (!existingCode) isUnique = true;
      attempts++;
    }
    if (!isUnique || !referralCode) {
      return c.json({ error: "Erro ao gerar código de indicação" }, 500);
    }

    const mochaUserId = `affiliate_${Math.random().toString(36).substring(2, 10)}`;
    const { data: newProfile, error: profileCreateError } = await supabase
      .from('user_profiles')
      .insert({
        mocha_user_id: mochaUserId,
        cpf: cleanCpf,
        role: 'affiliate',
        is_active: true,
        sponsor_id: sponsorId || undefined
      })
      .select()
      .single();

    if (profileCreateError || !newProfile) {
      console.error('[AFFILIATE_REGISTER] Supabase insert error (user_profiles):', profileCreateError?.message || profileCreateError);
      return c.json({ error: "Erro ao criar cadastro", details: profileCreateError?.message }, 500);
    }

    // Criar cupom do cliente usando CPF
    const { error: couponError } = await supabase
      .from('customer_coupons')
      .insert({
        coupon_code: cleanCpf,
        user_id: newProfile.id,
        cpf: cleanCpf,
        is_active: true
      });
    if (couponError) {
      console.error('[AFFILIATE_REGISTER] Erro ao criar cupom:', couponError.message);
      return c.json({ error: "Erro ao configurar cupom" }, 500);
    }

    const { error: settingsError } = await supabase
      .from('user_settings')
      .insert({
        user_id: newProfile.id,
        is_active_this_month: false,
        total_earnings: 0,
        available_balance: 0
      });
    if (settingsError) {
      return c.json({ error: "Erro ao criar configurações" }, 500);
    }

    // Create affiliate in Supabase (primary store for network and dashboards)
    const { data: supAffiliate, error: supAffError } = await supabase
      .from('affiliates')
      .insert({
        full_name: data.full_name,
        cpf: cleanCpf,
        email: data.email,
        phone: cleanWhatsapp || null,
        password_hash: passwordHash,
        referral_code: referralCode,
        sponsor_id: sponsorId || null,
        is_active: true,
        is_verified: true
      })
      .select()
      .single();

    if (supAffError || !supAffiliate) {
      console.error('[AFFILIATE_REGISTER] Supabase insert error (affiliates):', supAffError?.message || supAffError);
      return c.json({ error: 'Erro ao criar afiliado' }, 500);
    }

    

    const affiliate = {
      id: supAffiliate.id,
      full_name: data.full_name,
      email: data.email,
      referral_code: referralCode
    };

    // Create initial session so user can land in dashboard after registration
    const sessionToken = generateSessionToken();
    const expiresAt = getSessionExpiration();

    // Store session in Supabase for API access
    await supabase
      .from('affiliate_sessions')
      .insert({
        affiliate_id: affiliate.id,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString()
      });

    

    // Set session cookie (non-secure for localhost dev)
    const origin = c.req.header('Origin') || c.req.header('Host') || '';
    const isLocal = origin.includes('localhost') || origin.includes('127.0.0.1');
    setCookie(c, 'affiliate_session', sessionToken, {
      httpOnly: true,
      secure: !isLocal ? true : false,
      sameSite: !isLocal ? 'none' : 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
      expires: expiresAt,
    });

    console.log(`[AFFILIATE_REGISTER] Successful registration`, {
      affiliateId: affiliate.id,
      cpf: `***${data.cpf.slice(-4)}`,
      email: data.email,
      sponsor: data.referral_code,
      referralCode: affiliate.referral_code,
      ip: clientIP,
      timestamp: new Date().toISOString()
    });

    // Use CPF as customer coupon for simplicity and uniqueness
    const newCustomerCoupon = data.cpf;

    return c.json({ 
      success: true,
      affiliate: {
        id: affiliate.id,
        full_name: affiliate.full_name,
        email: affiliate.email,
        referral_code: affiliate.referral_code,
        customer_coupon: newCustomerCoupon
      }
    }, 201);
  } catch (error: any) {
    console.error('Affiliate registration error:', error);
    
    // Handle specific errors from registerAffiliate function
    if (error.message === 'CPF já cadastrado') {
      return c.json({ 
        field: "cpf",
        error: "CPF já está cadastrado" 
      }, 409);
    }
    
    if (error.message === 'Email já cadastrado') {
      return c.json({ 
        field: "email",
        error: "Email já está cadastrado" 
      }, 409);
    }
    
    if (error.message === 'Código de indicação inválido') {
      return c.json({ 
        field_errors: { 
          referral_code: "Código de indicação inválido" 
        } 
      }, 400);
    }
    
    return c.json({ error: "Erro interno do servidor" }, 500);
  }
});

// Affiliate login
app.post("/api/affiliate/login", zValidator("json", AffiliateLoginSchema), async (c) => {
  const { cpf, password } = c.req.valid("json");
  try {
    const cleanCpf = cpf.replace(/\D/g, '');
    if (!validateCPF(cleanCpf)) {
      return c.json({ error: "CPF inválido" }, 422);
    }
    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
    let { data: affiliate } = await supabase
      .from('affiliates')
      .select('*')
      .eq('cpf', cleanCpf)
      .eq('is_active', true)
      .single();
    if (!affiliate) {
      const { results: d1 } = await c.env.DB.prepare("SELECT * FROM affiliates WHERE cpf = ? AND is_active = 1").bind(cleanCpf).all();
      if (!d1 || d1.length === 0) {
        return c.json({ error: "CPF ou senha inválidos" }, 401);
      }
      const d1Aff = d1[0] as any;
      const ok = await bcrypt.compare(password, d1Aff.password_hash as string);
      if (!ok) {
        return c.json({ error: "CPF ou senha inválidos" }, 401);
      }
      const { data: created } = await supabase
        .from('affiliates')
        .upsert({
          full_name: d1Aff.full_name,
          cpf: d1Aff.cpf,
          email: d1Aff.email,
          whatsapp: d1Aff.whatsapp,
          password_hash: d1Aff.password_hash,
          referral_code: d1Aff.referral_code,
          sponsor_id: d1Aff.sponsor_id || null,
          is_active: Boolean(d1Aff.is_active),
          is_verified: Boolean(d1Aff.is_verified)
        }, { onConflict: 'cpf' })
        .select()
        .single();
      affiliate = created as any;
    }
    let storedHash = (affiliate as any).password_hash as string | null;
    if (!storedHash) {
      const newHash = await bcrypt.hash(password, 12);
      await supabase
        .from('affiliates')
        .update({ password_hash: newHash, updated_at: new Date().toISOString() })
        .eq('id', (affiliate as any).id);
      storedHash = newHash;
    }
    const valid = await bcrypt.compare(password, storedHash as string);
    if (!valid) {
      return c.json({ error: "CPF ou senha inválidos" }, 401);
    }
    const sessionToken = generateSessionToken();
    const expiresAt = getSessionExpiration();
    await supabase
      .from('affiliate_sessions')
      .delete()
      .eq('affiliate_id', (affiliate as any).id);
    await supabase
      .from('affiliate_sessions')
      .insert({ affiliate_id: (affiliate as any).id, session_token: sessionToken, expires_at: expiresAt.toISOString() });
    const origin = c.req.header('Origin') || c.req.header('Host') || '';
    const isLocal = origin.includes('localhost') || origin.includes('127.0.0.1');
    setCookie(c, 'affiliate_session', sessionToken, {
      httpOnly: true,
      secure: !isLocal ? true : false,
      sameSite: !isLocal ? 'none' : 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
      expires: expiresAt,
    });
    return c.json({
      success: true,
      affiliate: {
        id: (affiliate as any).id,
        full_name: (affiliate as any).full_name,
        email: (affiliate as any).email,
        referral_code: (affiliate as any).referral_code,
        customer_coupon: (affiliate as any).cpf
      }
    });
  } catch {
    return c.json({ error: "Erro interno do servidor" }, 500);
  }
});

// Get current affiliate
app.get("/api/affiliate/me", async (c) => {
  const sessionToken = getCookie(c, 'affiliate_session');

  if (!sessionToken) {
    return c.json({ error: "Não autenticado" }, 401);
  }

  try {
    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

    const { data: sessionData, error: sessionError } = await supabase
      .from('affiliate_sessions')
      .select(`
        affiliate_id,
        affiliates!inner(
          id,
          full_name,
          cpf,
          email,
          phone,
          referral_code,
          sponsor_id,
          is_verified,
          created_at,
          last_access_at
        )
      `)
      .eq('session_token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .eq('affiliates.is_active', true)
      .single();

    if (sessionError || !sessionData) {
      return c.json({ error: "Sessão expirada" }, 401);
    }

    const affiliate = (sessionData as any).affiliates;

    await supabase
      .from('affiliates')
      .update({ last_access_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', affiliate.id);

    const customerCoupon = affiliate.cpf;

    return c.json({
      id: affiliate.id,
      full_name: affiliate.full_name,
      cpf: affiliate.cpf,
      email: affiliate.email,
      whatsapp: (affiliate as any).phone,
      referral_code: affiliate.referral_code,
      customer_coupon: customerCoupon,
      sponsor_id: affiliate.sponsor_id,
      is_verified: Boolean(affiliate.is_verified),
      created_at: affiliate.created_at,
      last_access_at: affiliate.last_access_at
    });
  } catch (error) {
    console.error('Get affiliate error:', error);
    return c.json({ error: "Erro interno do servidor" }, 500);
  }
});

// Affiliate logout
app.post("/api/affiliate/logout", async (c) => {
  const sessionToken = getCookie(c, 'affiliate_session');

  if (sessionToken) {
    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
    await supabase
      .from('affiliate_sessions')
      .delete()
      .eq('session_token', sessionToken);
  }

  deleteCookie(c, 'affiliate_session', {
    path: '/',
    secure: true,
    sameSite: 'none',
  });

  return c.json({ success: true });
});

// Google OAuth start (redirect to Google)
app.get("/api/affiliate/oauth/google/start", async (c) => {
  try {
    // Get Google OAuth URL from Mocha service
    const response = await fetch(`${c.env.MOCHA_USERS_SERVICE_API_URL}/oauth/google/redirect_url`, {
      headers: {
        'Authorization': `Bearer ${c.env.MOCHA_USERS_SERVICE_API_KEY}`,
      },
    });

    if (!response.ok) {
      console.error('Failed to get Google OAuth URL:', response.status);
      return c.redirect('/login?error=oauth_error');
    }

    const data = await response.json() as { redirectUrl: string };
    
    // Redirect directly to Google OAuth
    return c.redirect(data.redirectUrl);
  } catch (error) {
    console.error('Google OAuth start error:', error);
    return c.redirect('/login?error=oauth_error');
  }
});

// Google OAuth callback
app.post("/api/affiliate/oauth/google/callback", async (c) => {
  const body = await c.req.json();
  const { code } = body;

  if (!code) {
    return c.json({ error: "No authorization code provided" }, 400);
  }

  try {
    // Exchange code for session token with Mocha service
    const response = await fetch(`${c.env.MOCHA_USERS_SERVICE_API_URL}/sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${c.env.MOCHA_USERS_SERVICE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      console.error('Failed to exchange code for token:', response.status);
      return c.json({ error: "Failed to authenticate with Google" }, 400);
    }

    const sessionData = await response.json() as { sessionToken: string };
    
    // Get user info from Mocha service
    const userResponse = await fetch(`${c.env.MOCHA_USERS_SERVICE_API_URL}/users/me`, {
      headers: {
        'Authorization': `Bearer ${sessionData.sessionToken}`,
      },
    });

    if (!userResponse.ok) {
      console.error('Failed to get user info:', userResponse.status);
      return c.json({ error: "Failed to get user information" }, 400);
    }

    const mochaUser = await userResponse.json() as { 
      email: string; 
      display_name?: string; 
    };
    
    // Check if affiliate already exists by email
    const { results: affiliateResults } = await c.env.DB.prepare(
      "SELECT * FROM affiliates WHERE email = ?"
    ).bind(mochaUser.email).all();

    let affiliate;
    
    if (affiliateResults.length === 0) {
      // Create new affiliate from Google account
      const referralCode = generateReferralCode();
      
      // Try to generate unique referral code
      let attempts = 0;
      let finalReferralCode = referralCode;
      while (attempts < 10) {
        const { results: codeCheck } = await c.env.DB.prepare(
          "SELECT id FROM affiliates WHERE referral_code = ?"
        ).bind(finalReferralCode).all();
        
        if (codeCheck.length === 0) break;
        finalReferralCode = generateReferralCode();
        attempts++;
      }

      // Create affiliate with Google account info
      const result = await c.env.DB.prepare(`
        INSERT INTO affiliates (
          full_name, cpf, email, password_hash, 
          referral_code, is_active, is_verified
        ) VALUES (?, ?, ?, ?, ?, 1, 1)
      `).bind(
        mochaUser.display_name || mochaUser.email.split('@')[0],
        null, // No CPF from Google
        mochaUser.email,
        '', // No password for Google users
        finalReferralCode
      ).run();

      if (!result.success) {
        return c.json({ error: "Failed to create affiliate account" }, 500);
      }

      const affiliateId = result.meta.last_row_id as number;
      
      // Get the created affiliate
      const { results: newAffiliateResults } = await c.env.DB.prepare(
        "SELECT * FROM affiliates WHERE id = ?"
      ).bind(affiliateId).all();
      
      affiliate = newAffiliateResults[0] as any;
    } else {
      affiliate = affiliateResults[0] as any;
      
      // Check if affiliate is active
      if (!affiliate.is_active) {
        return c.json({ error: "Conta inativa. Contate o suporte." }, 403);
      }
    }

    // Generate affiliate session token
    const sessionToken = generateSessionToken();
    const expiresAt = getSessionExpiration();

    // Clean up old sessions for this affiliate
    await c.env.DB.prepare(
      "DELETE FROM affiliate_sessions WHERE affiliate_id = ?"
    ).bind(affiliate.id).run();

    // Create new affiliate session
    await c.env.DB.prepare(`
      INSERT INTO affiliate_sessions (affiliate_id, session_token, expires_at)
      VALUES (?, ?, ?)
    `).bind(affiliate.id, sessionToken, expiresAt.toISOString()).run();

    // Set affiliate session cookie with universal HTTPS configuration
    setCookie(c, 'affiliate_session', sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
      expires: expiresAt,
    });

    // Update last access
    await c.env.DB.prepare(
      "UPDATE affiliates SET last_access_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(affiliate.id).run();

    // Also create user profile for integration with existing system
    await c.env.DB.prepare(`
      INSERT INTO user_profiles (mocha_user_id, cpf, role, is_active)
      VALUES (?, ?, 'affiliate', 1)
      ON CONFLICT(mocha_user_id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
    `).bind(`affiliate_${affiliate.id}`, affiliate.cpf).run();

    console.log(`[GOOGLE_AUTH] Successful affiliate login via Google`, {
      affiliateId: affiliate.id,
      email: affiliate.email,
      isNewAccount: affiliateResults.length === 0,
      timestamp: new Date().toISOString()
    });

    // Use CPF as customer coupon for simplicity and uniqueness
    const customerCoupon = affiliate.cpf;

    return c.json({ 
      success: true,
      affiliate: {
        id: affiliate.id,
        full_name: affiliate.full_name,
        email: affiliate.email,
        referral_code: affiliate.referral_code,
        customer_coupon: customerCoupon
      }
    });
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return c.json({ error: "Erro interno do servidor" }, 500);
  }
});

// Update affiliate profile
app.post("/api/affiliate/profile", async (c) => {
  const sessionToken = getCookie(c, 'affiliate_session');
  const body = await c.req.json();

  if (!sessionToken) {
    return c.json({ error: "Não autenticado" }, 401);
  }

  try {
    // Get affiliate from session
    const { results: sessionResults } = await c.env.DB.prepare(`
      SELECT a.id FROM affiliate_sessions s
      JOIN affiliates a ON s.affiliate_id = a.id
      WHERE s.session_token = ? AND s.expires_at > datetime('now') AND a.is_active = 1
    `).bind(sessionToken).all();

    if (sessionResults.length === 0) {
      return c.json({ error: "Sessão expirada" }, 401);
    }

    const affiliate = sessionResults[0] as any;
    const { full_name, whatsapp } = body;

    // Update affiliate profile
    await c.env.DB.prepare(`
      UPDATE affiliates SET 
        full_name = ?, 
        whatsapp = ?, 
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(full_name, whatsapp, affiliate.id).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Error updating affiliate profile:', error);
    return c.json({ error: "Erro ao atualizar perfil" }, 500);
  }
});

// Send password reset email function
async function sendPasswordResetEmail(
  email: string, 
  fullName: string, 
  resetLink: string
): Promise<void> {
  try {
    // Using basic fetch to send email via a service
    const emailData = {
      to: email,
      subject: 'CashMais - Redefinir Senha',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #001144, #000011); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #fff; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #70ff00; color: #001144; padding: 15px 30px; text-decoration: none; border-radius: 10px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 CashMais</h1>
              <p>Redefinição de Senha</p>
            </div>
            <div class="content">
              <p>Olá <strong>${fullName}</strong>,</p>
              <p>Recebemos uma solicitação para redefinir a senha da sua conta no CashMais.</p>
              <p>Para criar uma nova senha, clique no botão abaixo:</p>
              <p style="text-align: center;">
                <a href="${resetLink}" class="button">Redefinir Senha</a>
              </p>
              <p><strong>Importante:</strong></p>
              <ul>
                <li>Este link é válido por apenas 1 hora</li>
                <li>Use-o apenas uma vez</li>
                <li>Se você não solicitou esta redefinição, ignore este email</li>
              </ul>
              <p>Se o botão não funcionar, copie e cole este link no seu navegador:</p>
              <p style="word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 5px;">${resetLink}</p>
            </div>
            <div class="footer">
              <p>CashMais - Sistema de Afiliados<br>
              Este é um email automático, não responda.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    // For now, just log the email data (in production, integrate with email service)
    console.log('[EMAIL] Password reset email would be sent:', {
      to: email,
      subject: emailData.subject,
      resetLink: resetLink
    });

    // TODO: Integrate with actual email service (Resend, SendGrid, etc.)
    // const response = await fetch('https://api.resend.com/emails', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${env.RESEND_API_KEY}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     from: 'CashMais <noreply@cashmais.com>',
    //     to: [email],
    //     subject: emailData.subject,
    //     html: emailData.html,
    //   }),
    // });

  } catch (error) {
    console.error('[EMAIL] Failed to send password reset email:', error);
    // Don't throw error - password reset should work even if email fails
  }
}

// Password recovery request
app.post("/api/affiliate/password/forgot", zValidator("json", PasswordForgotSchema), async (c) => {
  const { identifier } = c.req.valid("json");
  const clientIP = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';

  try {
    // Determine if identifier is email or CPF
    const isEmail = identifier.includes('@');
    const cleanedCPF = isEmail ? null : identifier.replace(/\D/g, '');
    
    // Find affiliate by email or CPF
    const query = isEmail 
      ? "SELECT id, full_name, email FROM affiliates WHERE email = ? AND is_active = 1"
      : "SELECT id, full_name, email FROM affiliates WHERE cpf = ? AND is_active = 1";
    const searchValue = isEmail ? identifier : cleanedCPF;
    
    const { results } = await c.env.DB.prepare(query).bind(searchValue).all();

    // Always return success for security (don't reveal if identifier exists)
    // But only create token if affiliate actually exists
    if (results.length > 0) {
      const affiliate = results[0] as any;
      
      // Generate reset token
      const resetToken = crypto.randomUUID() + '-' + Date.now().toString(36);
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiration

      // Clean up old tokens for this affiliate
      await c.env.DB.prepare(
        "DELETE FROM affiliate_password_reset_tokens WHERE affiliate_id = ?"
      ).bind(affiliate.id).run();

      // Store reset token
      await c.env.DB.prepare(`
        INSERT INTO affiliate_password_reset_tokens (affiliate_id, token, expires_at)
        VALUES (?, ?, ?)
      `).bind(affiliate.id, resetToken, expiresAt.toISOString()).run();

      // Get origin for reset link
      const origin = c.req.header('Origin') || c.req.header('Host') || 'http://localhost:5173';
      const resetLink = `${origin}/afiliado/resetar-senha?token=${resetToken}`;
      
      // Send password reset email
      await sendPasswordResetEmail(affiliate.email, affiliate.full_name, resetLink);
      
      console.log(`[PASSWORD_RESET] Token generated for affiliate ${affiliate.id} (${affiliate.email}): ${resetToken}`);
      console.log(`[PASSWORD_RESET] Reset link: ${resetLink}`);
    }

    console.log(`[PASSWORD_RESET] Recovery request from ${clientIP} for identifier: ${isEmail ? identifier : `CPF:${cleanedCPF}`}`);

    return c.json({ success: true });
  } catch (error) {
    console.error('Affiliate password recovery error:', error);
    return c.json({ error: "Erro interno do servidor" }, 500);
  }
});

// Validate reset token
app.get("/api/affiliate/password/validate-token", async (c) => {
  const token = c.req.query('token');

  if (!token) {
    return c.json({ error: "Token não fornecido" }, 400);
  }

  try {
    const { results } = await c.env.DB.prepare(`
      SELECT prt.*, a.full_name, a.email
      FROM affiliate_password_reset_tokens prt
      JOIN affiliates a ON prt.affiliate_id = a.id
      WHERE prt.token = ? AND prt.expires_at > datetime('now') AND prt.used = 0 AND a.is_active = 1
    `).bind(token).all();

    if (results.length === 0) {
      return c.json({ error: "Token inválido ou expirado" }, 400);
    }

    const data = results[0] as any;

    return c.json({
      valid: true,
      affiliate: {
        full_name: data.full_name,
        email: data.email
      }
    });
  } catch (error) {
    console.error('Affiliate token validation error:', error);
    return c.json({ error: "Erro interno do servidor" }, 500);
  }
});

// Reset password
app.post("/api/affiliate/password/reset", zValidator("json", PasswordResetSchema), async (c) => {
  const { token, newPassword } = c.req.valid("json");
  const clientIP = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';

  try {
    // Find valid token
    const { results } = await c.env.DB.prepare(`
      SELECT prt.*, a.id as affiliate_id, a.email
      FROM affiliate_password_reset_tokens prt
      JOIN affiliates a ON prt.affiliate_id = a.id
      WHERE prt.token = ? AND prt.expires_at > datetime('now') AND prt.used = 0 AND a.is_active = 1
    `).bind(token).all();

    if (results.length === 0) {
      return c.json({ error: "Token inválido ou expirado" }, 400);
    }

    const tokenData = results[0] as any;

    // Hash new password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await c.env.DB.prepare(
      "UPDATE affiliates SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(passwordHash, tokenData.affiliate_id).run();

    // Mark token as used
    await c.env.DB.prepare(
      "UPDATE affiliate_password_reset_tokens SET used = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(tokenData.id).run();

    // Clean up all sessions for this affiliate (force re-login)
    await c.env.DB.prepare(
      "DELETE FROM affiliate_sessions WHERE affiliate_id = ?"
    ).bind(tokenData.affiliate_id).run();

    console.log(`[PASSWORD_RESET] Password reset completed for affiliate ${tokenData.affiliate_id} (${tokenData.email}) from IP ${clientIP}`);

    return c.json({ success: true });
  } catch (error) {
    console.error('Affiliate password reset error:', error);
    return c.json({ error: "Erro interno do servidor" }, 500);
  }
});

export default app;
