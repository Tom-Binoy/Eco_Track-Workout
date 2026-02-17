import { useState, useEffect } from 'react';
import { UserProfile } from '../types';

export function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // TODO: Implement actual Convex auth integration
  // For now, using fake user as in original code
  useEffect(() => {
    const fakeUser: UserProfile = {
      _id: 'user_01',
      email: 'user@example.com',
      name: 'Demo User',
      createdAt: Date.now(),
      preferences: {
        units: 'kg'
      }
    };
    
    setUser(fakeUser);
    setIsLoading(false);
  }, []);

  const login = async (): Promise<void> => {
    // TODO: Implement Google OAuth via Convex Auth
    console.log('Login not implemented yet');
  };

  const logout = async (): Promise<void> => {
    // TODO: Implement logout via Convex Auth
    setUser(null);
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout
  };
}
