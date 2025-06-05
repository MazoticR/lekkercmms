// components/ProtectedRoute.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { getCurrentUser, hasPermission } from '../lib/auth';

export default function ProtectedRoute({ 
  children, 
  requiredRole = 'user' 
}: { 
  children: React.ReactNode;
  requiredRole?: 'admin' | 'manager' | 'user';
}) {
  const router = useRouter();
  const currentUser = getCurrentUser();

  useEffect(() => {
    if (!currentUser) {
      router.push('/login');
    } else if (!hasPermission(currentUser, requiredRole)) {
      router.push('/');
    }
  }, [currentUser, router]);

  if (!currentUser || !hasPermission(currentUser, requiredRole)) {
    return <div>Loading or unauthorized...</div>;
  }

  return <>{children}</>;
}