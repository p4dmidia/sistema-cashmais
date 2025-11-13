import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { setCookie, getCookie, deleteCookie } from "hono/cookie";
import bcrypt from "bcryptjs";
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
  cpf: z.string().regex(/^\d{11}$/, "CPF deve ter 11 dígitos"),
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
    // Validate CPF
    if (!validateCPF(data.cpf)) {
      return c.json({ 
        field_errors: { 
          cpf: "CPF inválido" 
        } 
      }, 400);
    }

    // Check if CPF already exists
    const { results: cpfResults } = await c.env.DB.prepare(
      "SELECT id FROM affiliates WHERE cpf = ?"
    ).bind(data.cpf).all();

    if (cpfResults.length > 0) {
      return c.json({ 
        field: "cpf",
        error: "CPF já está cadastrado" 
      }, 409);
    }

    // Check if email already exists
    const { results: emailResults } = await c.env.DB.prepare(
      "SELECT id FROM affiliates WHERE email = ?"
    ).bind(data.email).all();

    if (emailResults.length > 0) {
      return c.json({ 
        field: "email",
        error: "Email já está cadastrado" 
      }, 409);
    }

    // Find sponsor by referral code if provided
    let sponsorId = null;
    if (data.referral_code) {
      const { results: sponsorResults } = await c.env.DB.prepare(
        "SELECT id FROM affiliates WHERE referral_code = ? AND is_active = 1"
      ).bind(data.referral_code).all();

      if (sponsorResults.length === 0) {
        return c.json({ 
          field_errors: { 
            referral_code: "Código de indicação inválido" 
          } 
        }, 400);
      }

      sponsorId = (sponsorResults[0] as any).id;
    }

    // Generate unique referral code
    let referralCode: string;
    let attempts = 0;
    do {
      referralCode = generateReferralCode();
      const { results: codeResults } = await c.env.DB.prepare(
        "SELECT id FROM affiliates WHERE referral_code = ?"
      ).bind(referralCode).all();
      
      if (codeResults.length === 0) break;
      attempts++;
    } while (attempts < 10);

    if (attempts >= 10) {
      return c.json({ error: "Erro ao gerar código de indicação" }, 500);
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(data.password, saltRounds);

    // Insert affiliate
    const result = await c.env.DB.prepare(`
      INSERT INTO affiliates (
        full_name, cpf, email, whatsapp, password_hash, 
        referral_code, sponsor_id, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `).bind(
      data.full_name,
      data.cpf,
      data.email,
      data.whatsapp || null,
      passwordHash,
      referralCode,
      sponsorId
    ).run();

    if (!result.success) {
      return c.json({ error: "Erro ao criar cadastro" }, 500);
    }

    const affiliateId = result.meta.last_row_id as number;

    // Generate session token
    const sessionToken = generateSessionToken();
    const expiresAt = getSessionExpiration();

    // Create session
    await c.env.DB.prepare(`
      INSERT INTO affiliate_sessions (affiliate_id, session_token, expires_at)
      VALUES (?, ?, ?)
    `).bind(affiliateId, sessionToken, expiresAt.toISOString()).run();

    // Set session cookie with universal HTTPS configuration
    setCookie(c, 'affiliate_session', sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
      expires: expiresAt,
    });

    // Also create user profile for integration with existing system
    await c.env.DB.prepare(`
      INSERT INTO user_profiles (mocha_user_id, cpf, role, is_active)
      VALUES (?, ?, 'affiliate', 1)
    `).bind(`affiliate_${affiliateId}`, data.cpf).run();

    console.log(`[AFFILIATE_REGISTER] Successful registration`, {
      affiliateId,
      cpf: `***${data.cpf.slice(-4)}`,
      email: data.email,
      sponsor: sponsorId,
      referralCode,
      ip: clientIP,
      timestamp: new Date().toISOString()
    });

    // Use CPF as customer coupon for simplicity and uniqueness
    const newCustomerCoupon = data.cpf;

    return c.json({ 
      success: true,
      affiliate: {
        id: affiliateId,
        full_name: data.full_name,
        email: data.email,
        referral_code: referralCode,
        customer_coupon: newCustomerCoupon
      }
    }, 201);
  } catch (error) {
    console.error('Affiliate registration error:', error);
    return c.json({ error: "Erro interno do servidor" }, 500);
  }
});

// Affiliate login
app.post("/api/affiliate/login", zValidator("json", AffiliateLoginSchema), async (c) => {
  const { cpf, password } = c.req.valid("json");
  const clientIP = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
  const userAgent = c.req.header('User-Agent') || 'unknown';

  console.log(`[AFFILIATE_LOGIN] Login attempt for CPF: ${cpf.substring(0, 3)}***`);

  try {
    // Validate CPF
    if (!validateCPF(cpf)) {
      console.log(`[AFFILIATE_LOGIN] Invalid CPF format: ${cpf.substring(0, 3)}***`);
      return c.json({ error: "CPF inválido" }, 422);
    }

    // Find affiliate by CPF
    console.log(`[AFFILIATE_LOGIN] Searching for affiliate with CPF: ${cpf.substring(0, 3)}***`);
    const { results: affiliateResults } = await c.env.DB.prepare(
      "SELECT * FROM affiliates WHERE cpf = ?"
    ).bind(cpf).all();
    
    console.log(`[AFFILIATE_LOGIN] Found ${affiliateResults.length} affiliates for CPF`);

    if (affiliateResults.length === 0) {
      console.warn(`[AFFILIATE_LOGIN] Failed login - affiliate not found`, {
        cpf: `***${cpf.slice(-4)}`,
        ip: clientIP,
        userAgent,
        timestamp: new Date().toISOString(),
        reason: 'affiliate_not_found'
      });
      return c.json({ error: "CPF ou senha inválidos" }, 401);
    }

    const affiliate = affiliateResults[0] as any;
    console.log(`[AFFILIATE_LOGIN] Found affiliate:`, {
      id: affiliate.id,
      email: affiliate.email,
      is_active: affiliate.is_active
    });

    // Check if affiliate is active
    if (!affiliate.is_active) {
      console.warn(`[AFFILIATE_LOGIN] Failed login - affiliate inactive`, {
        cpf: `***${cpf.slice(-4)}`,
        affiliateId: affiliate.id,
        ip: clientIP,
        userAgent,
        timestamp: new Date().toISOString(),
        reason: 'affiliate_inactive'
      });
      return c.json({ error: "Conta inativa. Contate o suporte." }, 403);
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, affiliate.password_hash);
    if (!passwordValid) {
      console.warn(`[AFFILIATE_LOGIN] Failed login - invalid password`, {
        cpf: `***${cpf.slice(-4)}`,
        affiliateId: affiliate.id,
        ip: clientIP,
        userAgent,
        timestamp: new Date().toISOString(),
        reason: 'invalid_password'
      });
      return c.json({ error: "CPF ou senha inválidos" }, 401);
    }

    // Generate session token
    const sessionToken = generateSessionToken();
    const expiresAt = getSessionExpiration();

    // Clean up old sessions for this affiliate
    await c.env.DB.prepare(
      "DELETE FROM affiliate_sessions WHERE affiliate_id = ?"
    ).bind(affiliate.id).run();

    // Create new session
    await c.env.DB.prepare(`
      INSERT INTO affiliate_sessions (affiliate_id, session_token, expires_at)
      VALUES (?, ?, ?)
    `).bind(affiliate.id, sessionToken, expiresAt.toISOString()).run();

    // Set session cookie with universal HTTPS configuration
    setCookie(c, 'affiliate_session', sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
      expires: expiresAt,
    });

    console.log(`[AFFILIATE_LOGIN] Successful login`, {
      cpf: `***${cpf.slice(-4)}`,
      affiliateId: affiliate.id,
      ip: clientIP,
      userAgent,
      timestamp: new Date().toISOString(),
      sessionToken: sessionToken.substring(0, 8) + '...'
    });

    // Use CPF as customer coupon for simplicity and uniqueness
    const affiliateCustomerCoupon = affiliate.cpf;

    return c.json({ 
      success: true,
      affiliate: {
        id: affiliate.id,
        full_name: affiliate.full_name,
        email: affiliate.email,
        referral_code: affiliate.referral_code,
        customer_coupon: affiliateCustomerCoupon
      }
    });
  } catch (error) {
    console.error(`[AFFILIATE_LOGIN] System error during login`, {
      cpf: `***${cpf.slice(-4)}`,
      ip: clientIP,
      userAgent,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
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
    const { results } = await c.env.DB.prepare(`
      SELECT a.* FROM affiliate_sessions s
      JOIN affiliates a ON s.affiliate_id = a.id
      WHERE s.session_token = ? AND s.expires_at > datetime('now') AND a.is_active = 1
    `).bind(sessionToken).all();

    if (results.length === 0) {
      return c.json({ error: "Sessão expirada" }, 401);
    }

    const affiliate = results[0] as any;

    // Update last access time
    await c.env.DB.prepare(
      "UPDATE affiliates SET last_access_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(affiliate.id).run();

    // Use CPF as customer coupon for simplicity and uniqueness
    const customerCoupon = affiliate.cpf;

    return c.json({
      id: affiliate.id,
      full_name: affiliate.full_name,
      cpf: affiliate.cpf,
      email: affiliate.email,
      whatsapp: affiliate.whatsapp,
      referral_code: affiliate.referral_code,
      customer_coupon: customerCoupon,
      sponsor_id: affiliate.sponsor_id,
      is_verified: Boolean(affiliate.is_verified),
      created_at: affiliate.created_at
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
    // Delete session from database
    await c.env.DB.prepare(
      "DELETE FROM affiliate_sessions WHERE session_token = ?"
    ).bind(sessionToken).run();
  }

  // Clear cookie with universal HTTPS configuration
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
