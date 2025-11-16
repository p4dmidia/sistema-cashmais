import { supabase } from './supabase';
import bcrypt from 'bcryptjs';

// Generate session token
function generateSessionToken(): string {
  return crypto.randomUUID() + "-" + Date.now();
}

// Admin login
export async function adminLogin(username: string, password: string) {
  try {
    console.log('[ADMIN_AUTH] Iniciando login de admin:', username);

    // Get admin user
    const { data: adminUser, error: userError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('username', username)
      .eq('is_active', true)
      .single();

    if (userError || !adminUser) {
      console.error('[ADMIN_AUTH] Admin não encontrado:', username);
      return { error: 'Credenciais inválidas - usuário não encontrado' };
    }

    console.log('[ADMIN_AUTH] Admin encontrado:', adminUser.id);

    // Verify password
    const passwordValid = await bcrypt.compare(password, adminUser.password_hash);
    
    if (!passwordValid) {
      console.error('[ADMIN_AUTH] Senha inválida para:', username);
      return { error: 'Credenciais inválidas' };
    }

    // Create session
    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const { data: session, error: sessionError } = await supabase
      .from('admin_sessions')
      .insert({
        admin_user_id: adminUser.id,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString(),
        ip_address: 'unknown', // Will be set by the API layer
        user_agent: 'unknown' // Will be set by the API layer
      })
      .select()
      .single();

    if (sessionError) {
      console.error('[ADMIN_AUTH] Erro ao criar sessão:', sessionError);
      return { error: 'Erro ao criar sessão' };
    }

    // Update last login
    const { error: updateError } = await supabase
      .from('admin_users')
      .update({ 
        last_login_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', adminUser.id);

    if (updateError) {
      console.error('[ADMIN_AUTH] Erro ao atualizar último login:', updateError);
    }

    // Log action
    const { error: logError } = await supabase
      .from('admin_audit_logs')
      .insert({
        admin_user_id: adminUser.id,
        action: 'LOGIN',
        entity_type: 'admin_session',
        ip_address: 'unknown',
        user_agent: 'unknown'
      });

    if (logError) {
      console.error('[ADMIN_AUTH] Erro ao registrar log:', logError);
    }

    console.log('[ADMIN_AUTH] Login realizado com sucesso:', adminUser.id);

    return {
      success: true,
      sessionToken,
      admin: {
        id: adminUser.id,
        username: adminUser.username,
        email: adminUser.email,
        full_name: adminUser.full_name
      }
    };

  } catch (error) {
    console.error('[ADMIN_AUTH] Erro crítico no login:', error);
    return { error: 'Erro interno do servidor' };
  }
}

// Get current admin user by session
export async function getCurrentAdmin(sessionToken: string) {
  try {
    console.log('[ADMIN_AUTH] Buscando admin atual por sessão');

    // Get session with user data
    const { data: session, error: sessionError } = await supabase
      .from('admin_sessions')
      .select(`
        *,
        admin_users!inner(*)
      `)
      .eq('session_token', sessionToken)
      .eq('admin_users.is_active', true)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (sessionError || !session) {
      console.error('[ADMIN_AUTH] Sessão inválida ou expirada');
      return { error: 'Sessão inválida' };
    }

    const adminUser = session.admin_users;

    return {
      admin: {
        id: adminUser.id,
        username: adminUser.username,
        email: adminUser.email,
        full_name: adminUser.full_name
      }
    };

  } catch (error) {
    console.error('[ADMIN_AUTH] Erro ao buscar admin atual:', error);
    return { error: 'Erro interno do servidor' };
  }
}

// Admin logout
export async function adminLogout(sessionToken: string) {
  try {
    console.log('[ADMIN_AUTH] Realizando logout');

    // Delete session from database
    const { error: deleteError } = await supabase
      .from('admin_sessions')
      .delete()
      .eq('session_token', sessionToken);

    if (deleteError) {
      console.error('[ADMIN_AUTH] Erro ao deletar sessão:', deleteError);
    }

    console.log('[ADMIN_AUTH] Logout realizado com sucesso');
    return { success: true };

  } catch (error) {
    console.error('[ADMIN_AUTH] Erro ao fazer logout:', error);
    return { error: 'Erro interno do servidor' };
  }
}

// Get all admin users (for management)
export async function getAllAdminUsers() {
  try {
    const { data: users, error } = await supabase
      .from('admin_users')
      .select('id, username, email, full_name, is_active, last_login_at, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[ADMIN_AUTH] Erro ao buscar usuários admin:', error);
      return { error: 'Erro ao buscar usuários' };
    }

    return { users };

  } catch (error) {
    console.error('[ADMIN_AUTH] Erro crítico ao buscar usuários:', error);
    return { error: 'Erro interno do servidor' };
  }
}

// Create new admin user
export async function createAdminUser(userData: {
  username: string;
  email: string;
  password: string;
  full_name: string;
}) {
  try {
    // Hash password
    const passwordHash = await bcrypt.hash(userData.password, 10);

    const { data: user, error } = await supabase
      .from('admin_users')
      .insert({
        username: userData.username,
        email: userData.email,
        password_hash: passwordHash,
        full_name: userData.full_name,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('[ADMIN_AUTH] Erro ao criar usuário admin:', error);
      return { error: 'Erro ao criar usuário' };
    }

    return { user };

  } catch (error) {
    console.error('[ADMIN_AUTH] Erro crítico ao criar usuário:', error);
    return { error: 'Erro interno do servidor' };
  }
}

// Update admin user
export async function updateAdminUser(userId: number, updates: {
  email?: string;
  full_name?: string;
  is_active?: boolean;
  password?: string;
}) {
  try {
    const updateData: any = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    // Hash password if provided
    if (updates.password) {
      updateData.password_hash = await bcrypt.hash(updates.password, 10);
      delete updateData.password;
    }

    const { data: user, error } = await supabase
      .from('admin_users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('[ADMIN_AUTH] Erro ao atualizar usuário admin:', error);
      return { error: 'Erro ao atualizar usuário' };
    }

    return { user };

  } catch (error) {
    console.error('[ADMIN_AUTH] Erro crítico ao atualizar usuário:', error);
    return { error: 'Erro interno do servidor' };
  }
}