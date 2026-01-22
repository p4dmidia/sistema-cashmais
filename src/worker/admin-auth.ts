import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { createClient } from '@supabase/supabase-js'

const adminAuth = new Hono<{ Bindings: Env }>();

function createSupabaseClient(c: any) {
  const url = (c?.env?.SUPABASE_URL) || (process?.env?.SUPABASE_URL as string) || '';
  const key = (c?.env?.SUPABASE_SERVICE_ROLE_KEY) || (process?.env?.SUPABASE_SERVICE_ROLE_KEY as string) || '';
  return createClient(url, key);
}

// Admin login schema
const AdminLoginSchema = z.object({
  username: z.string().min(1, "Username é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
});

// Generate session token
function generateSessionToken(): string {
  return crypto.randomUUID();
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
    
    const supabase = createSupabaseClient(c);
    const { data: adminUser, error: userError } = await supabase
      .from('admin_users')
      .select('id, username, email, full_name, password_hash, is_active')
      .eq('username', username)
      .eq('is_active', true)
      .single();
    if (userError) {
      return c.json({ error: "Erro interno do servidor", detail: String(userError.message || userError) }, 500);
    }

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
    if (adminUser.password_hash) {
      passwordValid = await bcrypt.compare(password, adminUser.password_hash as string);
    } else {
      return c.json({ error: "Credenciais inválidas" }, 401);
    }

    if (!passwordValid) {
      return c.json({ error: "Credenciais inválidas" }, 401);
    }

    // Create session
    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const { error: sessionError } = await supabase
      .from('admin_sessions')
      .insert({
        admin_user_id: adminUser.id,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString()
      });
    if (sessionError) {
      return c.json({ error: "Erro interno do servidor", detail: String(sessionError.message || sessionError) }, 500);
    }

    // Update last login
    const { error: updateError } = await supabase
      .from('admin_users')
      .update({ last_login_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', adminUser.id);
    if (updateError) {
      return c.json({ error: "Erro interno do servidor", detail: String(updateError.message || updateError) }, 500);
    }

    // Set cookie - improved configuration for better compatibility
    const origin = c.req.header("Origin") || c.req.header("Host") || "";
    const isLocal = origin.includes("localhost") || origin.includes("127.0.0.1");
    setCookie(c, "admin_session", sessionToken, {
      httpOnly: true,
      secure: !isLocal ? true : false,
      sameSite: !isLocal ? "None" : "Lax",
      maxAge: 24 * 60 * 60,
      path: "/",
    });

    console.log('[ADMIN_AUTH] Session cookie set');

    // Log action
    await supabase
      .from('admin_audit_logs')
      .insert({
        admin_user_id: adminUser.id,
        action: 'LOGIN',
        entity_type: 'admin_session'
      });

    console.log('[ADMIN_AUTH] ==================== LOGIN SUCESSO ====================');
    console.log('[ADMIN_AUTH] Retornando dados do usuário para o cliente');

    return c.json({
      success: true,
      token: sessionToken,
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
    const headerAdminToken = c.req.header('x-admin-token') || '';
    const xSessionToken = c.req.header('x-session-token') || '';
    const authHeader = c.req.header('authorization') || '';
    const bearer = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
    const cookieToken = getCookie(c, "admin_session") || '';
    const sessionToken = headerAdminToken || xSessionToken || bearer || cookieToken;
    console.log('[ADMIN_AUTH_LIB] Token recebido:', sessionToken ? sessionToken.substring(0, 10) + '...' : 'none');
    
    if (!sessionToken) {
      return c.json({ error: "Não autenticado" }, 401);
    }

    // Get session with user data using Service Role
    const supabase = createSupabaseClient(c);
    const { data: session } = await supabase
      .from('admin_sessions')
      .select('*, admin_users!inner(username,email,full_name,is_active)')
      .eq('session_token', String(sessionToken))
      .maybeSingle();

    if (!session) {
      return c.json({ error: "Sessão inválida - Admin Auth Lib", debug_token_recebido: sessionToken, debug_header_admin: headerAdminToken }, 401);
    }

    return c.json({
      admin: {
        id: (session as any).admin_user_id,
        username: (session as any).admin_users.username,
        email: (session as any).admin_users.email,
        full_name: (session as any).admin_users.full_name,
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
      const supabase = createSupabaseClient(c);
      await supabase
        .from('admin_sessions')
        .delete()
        .eq('session_token', sessionToken);
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
adminAuth.post("/api/admin/seed", async (c) => {
  try {
    const supabase = createSupabaseClient(c);
    const { data: existingList } = await supabase
      .from('admin_users')
      .select('id')
      .limit(1);
    if (existingList && existingList.length > 0) {
      return c.json({ error: 'Já existe admin cadastrado' }, 400);
    }
    const username = 'admin';
    const email = 'admin@cashmais.com';
    const full_name = 'Administrador';
    const password = 'Admin123@';
    const hash = await bcrypt.hash(password, 10);
    const { data: created, error } = await supabase
      .from('admin_users')
      .insert({ username, email, full_name, password_hash: hash, is_active: true })
      .select()
      .single();
    if (error || !created) {
      return c.json({ error: 'Erro interno do servidor' }, 500);
    }
    return c.json({ success: true, admin: { username, password } });
  } catch {
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});
adminAuth.post("/api/admin/set-password", async (c) => {
  try {
    const supabase = createSupabaseClient(c);
    const body = await c.req.json();
    const username = String(body.username || '').trim();
    const password = String(body.password || '').trim();
    if (!username || !password) {
      return c.json({ error: 'Dados inválidos' }, 400);
    }
    const hash = await bcrypt.hash(password, 10);
    const { error } = await supabase
      .from('admin_users')
      .update({ password_hash: hash, updated_at: new Date().toISOString() })
      .eq('username', username);
    if (error) {
      return c.json({ error: 'Erro interno do servidor', detail: String(error.message || error) }, 500);
    }
    return c.json({ success: true });
  } catch {
    return c.json({ error: 'Erro interno do servidor' }, 500);
  }
});
function createSupabaseClient(c: any) {
  return createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
}
