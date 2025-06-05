// lib/auth.ts
import  supabase  from './supabaseClient';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

type UserRole = 'admin' | 'manager' | 'user';

interface AppUser {
  id: string;
  username: string;
  full_name: string;
  role: UserRole;
}



// Vercel-safe session storage
function getStorage() {
  if (typeof window !== 'undefined') {
    return window.localStorage;
  }
  return {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
  };
}

export function storeUser(user: AppUser): void {
  getStorage().setItem('currentUser', JSON.stringify(user));
}

export function clearUser(): void {
  getStorage().removeItem('currentUser');
}

export function getCurrentUser(): AppUser | null {
  const user = getStorage().getItem('currentUser');
  return user ? JSON.parse(user) : null;
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

// lib/auth.ts
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    // First try modern verification
    const modernMatch = await bcrypt.compare(password, hash);
    if (modernMatch) return true;
    
    // If modern fails but hash starts with old prefix, try legacy
    if (hash.startsWith('$2a$')) {
      const legacyHash = hash.replace('$2a$', '$2b$');
      return await bcrypt.compare(password, legacyHash);
    }
    
    return false;
  } catch (err) {
    console.error('Password verification error:', err);
    return false;
  }
}

export async function login(username: string, password: string): Promise<AppUser | null> {
  const { data, error } = await supabase
    .from('app_users')
    .select('id, username, full_name, role, password_hash')
    .eq('username', username)
    .single();

  if (error || !data?.password_hash) return null;

  const isValid = await verifyPassword(password, data.password_hash);
  if (!isValid) return null;

  const user = {
    id: data.id,
    username: data.username,
    full_name: data.full_name,
    role: data.role
  };

  storeUser(user);
  return user;
}

export function logout(): void {
  clearUser();
  window.location.href = '/login';
}

// lib/auth.ts
export function hasPermission(user: AppUser | null, requiredRoles: string | string[]): boolean {
  if (!user) return false;
  
  // Convert single role to array
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  
  // Check if user has any of the required roles
  return roles.includes(user.role);
}