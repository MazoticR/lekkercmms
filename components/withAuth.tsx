// components/withAuth.tsx
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { getCurrentUser, hasPermission } from '../lib/auth';

export function withAuth<P extends {}>(
  Component: React.ComponentType<P>,
  requiredRole: string | string[]
) {
  return function ProtectedComponent(props: P) {
    const router = useRouter();
    const currentUser = getCurrentUser();

    useEffect(() => {
      if (!currentUser || !hasPermission(currentUser, requiredRole)) {
        router.push('/');
      }
    }, [currentUser, router, requiredRole]);

    if (!currentUser || !hasPermission(currentUser, requiredRole)) {
      return <div>Loading or unauthorized...</div>;
    }

    return <Component {...props} />;
  };
}
