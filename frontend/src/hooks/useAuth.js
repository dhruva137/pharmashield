import { useState, useEffect } from 'react';

export function useAuth() {
  const [user, setUser] = useState(() => {
    const stored = sessionStorage.getItem('shockmap_user');
    return stored ? JSON.parse(stored) : null;
  });

  const login = (userData = null) => {
    // Default demo user if no data provided
    const demoUser = userData || {
      uid: 'demo-123',
      displayName: 'Demo Intelligence Officer',
      email: 'demo@shockmap.ai',
      photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
      role: 'Analyst'
    };
    sessionStorage.setItem('shockmap_user', JSON.stringify(demoUser));
    sessionStorage.setItem('shockmap_guest', '0');
    setUser(demoUser);
  };

  const logout = () => {
    sessionStorage.removeItem('shockmap_user');
    sessionStorage.removeItem('shockmap_guest');
    setUser(null);
    window.location.href = '/';
  };

  const enterAsGuest = () => {
    sessionStorage.setItem('shockmap_guest', '1');
    sessionStorage.removeItem('shockmap_user');
    setUser(null);
  };

  return { user, login, logout, enterAsGuest, isAuthenticated: !!user };
}
