// hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { getCurrentUser, AppUser } from '../lib/auth';

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
  }, []);

  return currentUser;
}
