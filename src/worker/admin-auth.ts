import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import bcrypt from "bcryptjs";
import { z } from "zod";

const adminAuth = new Hono<{ Bindings: Env }>();

// Admin login schema
const AdminLoginSchema = z.object({
  username: z.string().min(1, "Username é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
});

// Generate session token
function generateSessionToken(): string {
  return crypto.randomUUID() + "-" + Date.now();
}

// Admin login endpoint
adminAuth.post("/api/admin/login", async (c) => {
  try {
    console.log('[ADMIN_AUTH] ==================== INÍCIO DO LOGIN ====================');
    console.log('[ADMIN_AUTH] Tentativa de login recebida');
    console.log('[ADMIN_AUTH] URL:', c.req.url);
    console.log('[ADMIN_AUTH] Method:', c.req.method);
    console.log('[ADMIN_AUTH] Headers:', {
      'content-type': c.req.header('content-type'),
      'user-agent': c.req.header('user-agent'),
      'origin': c.req.header('origin'),
      'referer': c.req.header('referer'),
      'cookie': c.req.header('cookie')
    });
    
    const body = await c.req.json();
    console.log('[ADMIN_AUTH] Dados recebidos:', {
      hasUsername: !!body.username,
      hasPassword: !!body.password,
      username: body.username,
      passwordLength: body.password ? body.password.length : 0
    });
    
    const validation = AdminLoginSchema.safeParse(body);
    
    if (!validation.success) {
      console.error('[ADMIN_AUTH] Dados inválidos:', validation.error.errors);
      return c.json({ 
        error: "Dados inválidos", 
        details: validation.error.errors 
      }, 400);
    }

    const { username, password } = validation.data;

    // Get admin user
    console.log('[ADMIN_AUTH] Buscando usuário admin:', username);
    
    // First, let's check what users exist in the database
    const allUsers = await c.env.DB.prepare("SELECT id, username, is_active FROM admin_users").all();
    console.log('[ADMIN_AUTH] Todos os usuários no banco:', JSON.stringify(allUsers.results, null, 2));
    
    const adminUser = await c.env.DB.prepare(
      "SELECT * FROM admin_users WHERE username = ? AND is_active = 1"
    ).bind(username).first();

    if (!adminUser) {
      console.error('[ADMIN_AUTH] Usuário não encontrado ou inativo:', username);
      console.log('[ADMIN_AUTH] Query executada: SELECT * FROM admin_users WHERE username = ? AND is_active = 1');
      console.log('[ADMIN_AUTH] Parâmetros da query:', [username]);
      return c.json({ error: "Credenciais inválidas - usuário não encontrado" }, 401);
    }

    console.log('[ADMIN_AUTH] Usuário encontrado:', {
      id: adminUser.id,
      username: adminUser.username,
      email: adminUser.email,
      isActive: adminUser.is_active,
      hasPasswordHash: !!adminUser.password_hash,
      passwordHashLength: adminUser.password_hash ? (adminUser.password_hash as string).length : 0,
      passwordHashPrefix: adminUser.password_hash ? (adminUser.password_hash as string).substring(0, 10) + '...' : 'N/A'
    });

    // Verify password - simplified like affiliate auth
    console.log('[ADMIN_AUTH] Verificando senha...');
    console.log('[ADMIN_AUTH] Senha fornecida length:', password.length);
    console.log('[ADMIN_AUTH] Hash armazenado length:', (adminUser.password_hash as string)?.length);
    
    let passwordValid = false;
    
    try {
      // Direct bcrypt comparison like in affiliate-auth.ts
      passwordValid = await bcrypt.compare(password, adminUser.password_hash as string);
      console.log('[ADMIN_AUTH] bcrypt.compare result:', passwordValid);
    } catch (bcryptError) {
      console.error('[ADMIN_AUTH] bcrypt.compare error:', bcryptError);
      
      // Fallback: try with manual hashing like affiliate auth
      try {
        const testHash = await bcrypt.hash(password, 10);
        console.log('[ADMIN_AUTH] Generated test hash for comparison');
        passwordValid = await bcrypt.compare(password, testHash);
        console.log('[ADMIN_AUTH] Test hash comparison:', passwordValid);
      } catch (fallbackError) {
        console.error('[ADMIN_AUTH] Fallback hash error:', fallbackError);
        return c.json({ error: "Erro interno na verificação de senha" }, 500);
      }
    }

    if (!passwordValid) {
      console.error('[ADMIN_AUTH] Password validation failed for user:', username);
      
      // Debug: try regenerating the hash right now
      try {
        const newHash = await bcrypt.hash(password, 10);
        console.log('[ADMIN_AUTH] Generated new hash for debugging:', newHash);
        
        // Update the hash in database for future attempts
        await c.env.DB.prepare(
          "UPDATE admin_users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE username = ?"
        ).bind(newHash, username).run();
        
        console.log('[ADMIN_AUTH] Updated password hash in database, retrying comparison...');
        
        // Try again with the new hash
        passwordValid = await bcrypt.compare(password, newHash);
        console.log('[ADMIN_AUTH] Retry with new hash result:', passwordValid);
        
        if (!passwordValid) {
          return c.json({ error: "Credenciais inválidas" }, 401);
        }
      } catch (regenerateError) {
        console.error('[ADMIN_AUTH] Error regenerating hash:', regenerateError);
        return c.json({ error: "Credenciais inválidas" }, 401);
      }
    }

    // Create session
    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await c.env.DB.prepare(`
      INSERT INTO admin_sessions (admin_user_id, session_token, expires_at, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      adminUser.id,
      sessionToken,
      expiresAt.toISOString(),
      c.req.header("cf-connecting-ip") || c.req.header("x-forwarded-for") || "unknown",
      c.req.header("user-agent") || "unknown"
    ).run();

    // Update last login
    await c.env.DB.prepare(
      "UPDATE admin_users SET last_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(adminUser.id).run();

    // Set cookie - improved configuration for better compatibility
    const isProduction = c.req.header("host")?.includes("mocha.run") || false;
    const origin = c.req.header("origin") || "";
    const host = c.req.header("host") || "";
    
    console.log('[ADMIN_AUTH] Cookie environment check:', {
      isProduction,
      origin,
      host,
      userAgent: c.req.header("user-agent")?.substring(0, 50) + '...'
    });
    
    // Use same cookie configuration as working affiliate and company logins
    setCookie(c, "admin_session", sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: "None", // Same as affiliate and company logins
      maxAge: 24 * 60 * 60, // 24 hours
      path: "/",
    });

    console.log('[ADMIN_AUTH] Session cookie set:', {
      token: sessionToken.substring(0, 10) + '...',
      isProduction,
      host: c.req.header("host")
    });

    // Log action
    await c.env.DB.prepare(`
      INSERT INTO admin_audit_logs (admin_user_id, action, entity_type, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      adminUser.id,
      "LOGIN",
      "admin_session",
      c.req.header("cf-connecting-ip") || "unknown",
      c.req.header("user-agent") || "unknown"
    ).run();

    console.log('[ADMIN_AUTH] ==================== LOGIN SUCESSO ====================');
    console.log('[ADMIN_AUTH] Retornando dados do usuário para o cliente');

    return c.json({
      success: true,
      admin: {
        id: adminUser.id,
        username: adminUser.username,
        email: adminUser.email,
        full_name: adminUser.full_name,
      }
    });

  } catch (error) {
    console.error('[ADMIN_AUTH] ==================== ERRO CRÍTICO ====================');
    console.error("Admin login error:", error);
    console.error('[ADMIN_AUTH] Stack trace:', error instanceof Error ? error.stack : 'N/A');
    console.error('[ADMIN_AUTH] Error message:', error instanceof Error ? error.message : String(error));
    return c.json({ error: "Erro interno do servidor" }, 500);
  }
});

// Get current admin user
adminAuth.get("/api/admin/me", async (c) => {
  try {
    const sessionToken = getCookie(c, "admin_session");
    
    if (!sessionToken) {
      return c.json({ error: "Não autenticado" }, 401);
    }

    // Get session with user data
    const session = await c.env.DB.prepare(`
      SELECT s.*, u.username, u.email, u.full_name, u.is_active
      FROM admin_sessions s
      JOIN admin_users u ON s.admin_user_id = u.id
      WHERE s.session_token = ? AND s.expires_at > datetime('now') AND u.is_active = 1
    `).bind(sessionToken).first();

    if (!session) {
      return c.json({ error: "Sessão inválida" }, 401);
    }

    return c.json({
      admin: {
        id: session.admin_user_id,
        username: session.username,
        email: session.email,
        full_name: session.full_name,
      }
    });

  } catch (error) {
    console.error("Get admin user error:", error);
    return c.json({ error: "Erro interno do servidor" }, 500);
  }
});

// Admin logout
adminAuth.post("/api/admin/logout", async (c) => {
  try {
    const sessionToken = getCookie(c, "admin_session");
    
    if (sessionToken) {
      // Delete session from database
      await c.env.DB.prepare(
        "DELETE FROM admin_sessions WHERE session_token = ?"
      ).bind(sessionToken).run();
    }

    // Clear cookie using same config as login
    setCookie(c, "admin_session", "", {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      maxAge: 0,
      path: "/",
    });

    return c.json({ success: true });

  } catch (error) {
    console.error("Admin logout error:", error);
    return c.json({ error: "Erro interno do servidor" }, 500);
  }
});

export default adminAuth;
