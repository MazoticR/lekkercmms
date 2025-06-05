// lib/auth.ts
import  supabase  from './supabaseClient';

type UserRole = 'admin' | 'manager' | 'user';

interface AppUser {
  id: string;
  username: string;
  full_name: string;
  role: UserRole;
}

export async function login(username: string, password: string): Promise<AppUser | null> {
  // In a real app, you'd use Supabase Auth properly
  // This is a simplified version for demonstration
  const { data, error } = await supabase
    .from('app_users')
    .select('id, username, full_name, role')
    .eq('username', username)
    .eq('password_hash', password) // In reality, use proper hashing!
    .single();

  if (error || !data) return null;
  
  // Store in localStorage
  localStorage.setItem('currentUser', JSON.stringify(data));
  return data;
}

export function logout(): void {
  localStorage.removeItem('currentUser');
  window.location.href = '/login';
}

export function getCurrentUser(): AppUser | null {
  const user = localStorage.getItem('currentUser');
  return user ? JSON.parse(user) : null;
}

export function hasPermission(user: AppUser | null, requiredRole: UserRole): boolean {
  if (!user) return false;
  const roleHierarchy = { user: 0, manager: 1, admin: 2 };
  return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
}