'use client';
import { useEffect, useState } from 'react';


export function useUsername() {
  const [username, setUsername] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('username') || '';
    setUsername(stored);
    setIsLoaded(true);
  }, []);

  const save = (name: string) => {
    localStorage.setItem('username', name);
    setUsername(name);
    setIsLoaded(true);
  };

  const logout = () => {
    localStorage.removeItem('username');
    setUsername('');
    setIsLoaded(true);
  };

  return { username, save, logout, isLoaded };
}
